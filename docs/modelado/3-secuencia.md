# 3. Diagrama de secuencia — Confirmar pedido

Caso de uso modelado: **Confirmar pedido**, iniciado desde la web pública (modo nube). Es el recorrido más largo del sistema: toca la SPA, Supabase, el servidor local y vuelve.

```mermaid
sequenceDiagram
  actor M as Mesero
  participant SPA as SPA React<br/>(api.js · nube.js)
  participant SB as Supabase<br/>(externo)
  participant SY as Sincronizador
  participant AO as AplicadorOrdenes
  participant PS as PedidoService
  participant R as Repositorios SQLite
  participant NT as NotificadorTransaccional
  actor C as Cocina (KDS local)

  Note over M,SPA: Caso de uso: Confirmar pedido
  M->>+SPA: confirmar_pedido {mesa, items}
  SPA->>+SB: insert ordenes_pendientes {tipo: confirmar_pedido, payload}
  SB-->>-SPA: id de la orden
  par El local procesa la orden
    SB-)SY: Realtime INSERT ordenes_pendientes
    activate SY
    SY->>+SB: obtenerOrdenesPendientes()
    SB-->>-SY: [{id, tipo, payload}]
    SY->>+AO: aplicarOrden(orden)
    AO->>NT: retener() [transacción aplicarYRegistrar]
    AO->>+PS: confirmarPedido(payload)
    PS->>PS: _validarItems(items)
    PS->>+R: menuItems.obtener(id)
    R-->>-PS: MenuItem
    alt ítem inexistente, agotado o cantidad inválida
      PS-->>AO: {ok:false, tipo, error}
      AO->>R: registro.guardar(id, rechazada, resultado)
    else ítems válidos
      PS->>R: pedidos.guardar() y mesas.ocupar()
      PS->>NT: emitir(estado_mesas, cambio_estado_pedido)
      PS->>R: pedidos.guardar(items) → En Cocina
      PS->>NT: emitir(pedido_items_actualizado)
      PS-->>AO: {ok:true, estado, items, total}
      AO->>R: registro.guardar(id, aplicada, resultado)
    end
    deactivate PS
    Note over AO,R: COMMIT
    NT-->>C: publicar() eventos Socket.IO
    NT-)SY: marcarCambio() [NotificadorConAviso]
    AO-->>-SY: {estado, resultado}
    SY->>SB: marcarOrden(id, estado, resultado)
    SY->>SB: rpc sincronizar_estado(foto del estado local)
    deactivate SY
    SB-)SPA: Realtime postgres_changes → estado_mesas
  and La SPA espera el resultado
    loop cada 1 s, hasta 8 s
      SPA->>SB: select estado, resultado de ordenes_pendientes
      SB-->>SPA: estado, resultado
    end
    alt el local respondió a tiempo
      SPA-->>M: respuesta_pedido {ok, estado, total} o {ok:false, error}
    else sin respuesta (el local no tiene internet)
      SPA-->>M: respuesta_pedido {ok:true, pendiente:true}
    end
    deactivate SPA
  end
```

## Nota de lectura
- Se eligió este caso porque une los dos mundos del sistema híbrido: la web no escribe datos, deja una orden, y el servidor local sigue siendo la autoridad. En modo local el recorrido es el mismo desde `PedidoService.confirmarPedido` hacia abajo; solo cambia la puerta de entrada (`socket.handlers` en vez de `AplicadorOrdenes`).
- Las reglas se validan una sola vez, en `PedidoService`, nunca en la SPA ni en Supabase: por eso el `alt` cubre el rechazo (ítem agotado o cantidad fuera de 1–99) y la orden queda `rechazada` con su motivo en vez de perderse.
- Los eventos se **retienen hasta el COMMIT** (`NotificadorTransaccional`): si algo falla, la cocina no recibe el aviso de un pedido que no existe. `AplicadorOrdenes` anota la orden en la misma transacción para que, si se corta internet antes de `marcarOrden`, al reintentar no se aplique dos veces.
- La SPA espera como máximo 8 s el resultado. Si el local no responde, devuelve `pendiente:true` y no un error, para que nadie reenvíe la orden y quede duplicada. Por eso el segundo `alt`.
- La subida a Supabase ocurre después del COMMIT y de forma asíncrona (`marcarCambio` espera 300 ms): el POS local nunca espera a la nube.
- `confirmarPedido` llama internamente a `actualizarEstado` dos veces (Recibido → En Cocina) y emite `estado_mesas` solo al ocupar la mesa; el diagrama lo resume. Mensajes verificados en `ordenes-nube.js`, `sincronizador.js`, `pedido.service.js`, `transacciones.js` y `nube.js`.
