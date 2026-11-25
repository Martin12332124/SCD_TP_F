// src/componentes/AdminMesas.jsx
// Pantalla "Configurar mesas": agregar y quitar mesas del restaurante.
// Está separada de la operación diaria (se abre desde el encabezado y tapa la sala) y
// quitar una mesa pide confirmación en un segundo toque, para que nadie la quite por accidente.
// Los cambios llegan a todos los clientes por el evento 'estado_mesas' que emite el backend.
//
// Props:
//   mesas     {Array}    - Mesas actuales [{ id, numero, estado, estadoPedido? }]
//   conectado {boolean}  - Sin conexión no se puede agregar ni quitar
//   onCerrar  {Function} - Vuelve a la sala

import { useState } from 'react';
import { agregarMesa, quitarMesa } from '../servicios/api';
import { validarNumeroMesaNueva, NUMERO_MESA_MAXIMO } from '../validaciones/validaciones';
import { estadoVisualMesa } from '../shared/utils/estadoMesa.js';
import { textoRechazo } from '../utils/rechazo';

function AdminMesas({ mesas, conectado, onCerrar }) {
  const [numeroNuevo, setNumeroNuevo] = useState('');
  const [errorNumero, setErrorNumero] = useState('');
  // Resultado de la última operación: { ok: boolean, texto: string } o null
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  // Mesa que espera confirmación para quitarse (segundo toque)
  const [porQuitar, setPorQuitar] = useState(null);

  const masAlta = mesas.reduce((max, m) => Math.max(max, m.numero), 0);
  const siguiente = masAlta + 1;
  const haySiguiente = siguiente <= NUMERO_MESA_MAXIMO;

  /** Llama al backend y muestra el resultado; los rechazos llegan con tipo y motivo. */
  const ejecutar = async (operacion, textoExito) => {
    setResultado(null);
    setEnviando(true);
    try {
      const data = await operacion();
      if (data.ok) {
        setResultado({ ok: true, texto: `✅ ${textoExito(data)}` });
        return true;
      }
      setResultado({ ok: false, texto: textoRechazo(data) });
    } catch {
      setResultado({ ok: false, texto: '⚠️ Error de red: no se pudo contactar al servidor.' });
    } finally {
      setEnviando(false);
    }
    return false;
  };

  const agregarSiguiente = () => {
    setPorQuitar(null);
    ejecutar(
      () => agregarMesa(),
      (data) => `Mesa ${data.mesa.numero} agregada.`
    );
  };

  const agregarConNumero = async (evento) => {
    evento.preventDefault();
    setPorQuitar(null);
    // Validación defensiva antes de llamar al backend
    const validacion = validarNumeroMesaNueva(numeroNuevo, mesas);
    if (!validacion.esValido) {
      setErrorNumero(validacion.mensajeError);
      return;
    }
    setErrorNumero('');
    const ok = await ejecutar(
      () => agregarMesa(validacion.numero),
      (data) => `Mesa ${data.mesa.numero} agregada.`
    );
    if (ok) setNumeroNuevo('');
  };

  const confirmarQuitar = (mesa) => {
    setPorQuitar(null);
    ejecutar(
      () => quitarMesa(mesa.numero),
      () => `Mesa ${mesa.numero} quitada.`
    );
  };

  return (
    <div role="dialog" aria-label="Configurar mesas" style={estilos.overlay}>
      <div style={estilos.encabezado}>
        <div style={estilos.encabezadoInterior}>
          <h2 style={estilos.titulo}>Configurar mesas</h2>
          <button id="btn-cerrar-admin" onClick={onCerrar} style={estilos.botonVolver}>
            ← Volver a la sala
          </button>
        </div>
      </div>

      <div style={estilos.cuerpo}>
        <p style={estilos.texto}>
          El restaurante tiene <strong>{mesas.length}</strong>{' '}
          {mesas.length === 1 ? 'mesa' : 'mesas'}. Solo se puede quitar una mesa libre y sin pedido,
          y siempre debe quedar al menos una.
        </p>

        {resultado && (
          <div
            id="resultado-admin"
            role={resultado.ok ? 'status' : 'alert'}
            style={{
              ...estilos.aviso,
              ...(resultado.ok ? estilos.tonoExito : estilos.tonoPeligro)
            }}
          >
            {resultado.texto}
          </div>
        )}

        {/* Agregar */}
        <section style={estilos.bloque}>
          <h3 style={estilos.subtitulo}>Agregar mesa</h3>
          <button
            id="btn-agregar-siguiente"
            onClick={agregarSiguiente}
            disabled={!conectado || enviando || !haySiguiente}
            style={{ ...estilos.boton, ...estilos.botonPrimario }}
          >
            {haySiguiente
              ? `+ Agregar mesa ${siguiente}`
              : `Ya existe la mesa ${NUMERO_MESA_MAXIMO}`}
          </button>

          <form onSubmit={agregarConNumero} style={estilos.formulario}>
            <label htmlFor="input-numero-mesa" style={estilos.rotulo}>
              O elige el número (1 a {NUMERO_MESA_MAXIMO}), por ejemplo para recuperar una mesa
              quitada:
            </label>
            <div style={estilos.filaFormulario}>
              <input
                id="input-numero-mesa"
                type="number"
                inputMode="numeric"
                step="1"
                value={numeroNuevo}
                onChange={(e) => {
                  setNumeroNuevo(e.target.value);
                  setErrorNumero('');
                }}
                disabled={!conectado || enviando}
                style={estilos.campo}
              />
              <button
                type="submit"
                disabled={!conectado || enviando}
                style={{ ...estilos.boton, ...estilos.botonSecundario, ...estilos.botonFormulario }}
              >
                Agregar
              </button>
            </div>
            {errorNumero && (
              <p id="error-numero-mesa" role="alert" style={estilos.errorCampo}>
                {errorNumero}
              </p>
            )}
          </form>
        </section>

        {/* Quitar */}
        <section style={estilos.bloque}>
          <h3 style={estilos.subtitulo}>Mesas actuales</h3>
          <ul style={estilos.lista}>
            {mesas.map((m) => {
              const visual = estadoVisualMesa(m);
              const ocupada = m.estado === 'ocupada';
              const confirmando = porQuitar === m.id;
              return (
                <li key={m.id} id={`fila-mesa-${m.numero}`} style={estilos.fila}>
                  <span
                    style={{
                      ...estilos.muestra,
                      background: `var(--mesa-${visual.clave})`,
                      color: `var(--mesa-${visual.clave}-texto)`
                    }}
                  >
                    {m.numero}
                  </span>
                  <span style={estilos.filaTexto}>
                    <strong>Mesa {m.numero}</strong>
                    <span>{ocupada ? `${visual.etiqueta}: libérala para quitarla` : 'Libre'}</span>
                  </span>

                  {!confirmando && (
                    <button
                      id={`btn-quitar-mesa-${m.numero}`}
                      onClick={() => setPorQuitar(m.id)}
                      disabled={!conectado || enviando || ocupada}
                      aria-label={`Quitar la mesa ${m.numero}`}
                      style={{ ...estilos.botonFila, ...estilos.botonQuitar }}
                    >
                      Quitar
                    </button>
                  )}

                  {confirmando && (
                    <span style={estilos.confirmacion}>
                      <span style={estilos.pregunta}>¿Quitar la mesa {m.numero}?</span>
                      <button
                        id={`btn-confirmar-quitar-${m.numero}`}
                        onClick={() => confirmarQuitar(m)}
                        disabled={!conectado || enviando}
                        style={{ ...estilos.botonFila, ...estilos.botonPeligro }}
                      >
                        Sí, quitar
                      </button>
                      <button
                        onClick={() => setPorQuitar(null)}
                        style={{ ...estilos.botonFila, ...estilos.botonSecundario }}
                      >
                        Cancelar
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    overflowY: 'auto',
    background: 'var(--color-fondo)',
    color: 'var(--color-texto)',
    textAlign: 'left',
    lineHeight: 1.5
  },
  encabezado: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    background: 'var(--fondo-encabezado)',
    borderBottom: '3px solid var(--color-azafran)'
  },
  encabezadoInterior: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '14px clamp(16px, 4vw, 32px)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  titulo: {
    margin: 0,
    fontSize: '28px',
    color: 'var(--color-encabezado-texto)'
  },
  botonVolver: {
    minHeight: 'var(--toque)',
    padding: '10px 18px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: 'var(--color-encabezado-texto)',
    borderRadius: 'var(--radio-m)',
    background: 'transparent',
    color: 'var(--color-encabezado-texto)',
    fontSize: '17px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  cuerpo: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px clamp(16px, 4vw, 32px) 48px'
  },
  texto: {
    margin: '0 0 18px',
    fontSize: '17px'
  },
  aviso: {
    padding: '12px 16px',
    marginBottom: '18px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderRadius: 'var(--radio-m)',
    fontSize: '16px',
    fontWeight: 600
  },
  tonoExito: {
    background: 'var(--color-exito-suave)',
    color: 'var(--color-exito-texto)',
    borderColor: 'var(--color-exito)'
  },
  tonoPeligro: {
    background: 'var(--color-peligro-suave)',
    color: 'var(--color-peligro-texto)',
    borderColor: 'var(--color-peligro)'
  },
  bloque: {
    background: 'var(--color-superficie)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'var(--color-borde)',
    borderRadius: 'var(--radio-l)',
    padding: '20px',
    marginBottom: '20px'
  },
  subtitulo: {
    margin: '0 0 14px',
    fontSize: '22px'
  },
  boton: {
    minHeight: 'var(--toque)',
    padding: '12px 18px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderRadius: 'var(--radio-m)',
    fontSize: '17px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  botonPrimario: {
    width: '100%',
    background: 'var(--color-primario)',
    color: 'var(--color-sobre-primario)',
    borderColor: 'var(--color-primario)'
  },
  botonSecundario: {
    background: 'var(--color-superficie)',
    color: 'var(--color-texto)',
    borderColor: 'var(--color-texto-suave)'
  },
  formulario: {
    marginTop: '16px'
  },
  rotulo: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '16px',
    color: 'var(--color-texto)'
  },
  filaFormulario: {
    display: 'flex',
    gap: '10px'
  },
  campo: {
    flex: 1,
    minWidth: 0,
    minHeight: 'var(--toque)',
    padding: '10px 14px',
    fontSize: '19px',
    color: 'var(--color-texto)',
    background: 'var(--color-fondo)',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: 'var(--color-texto-suave)',
    borderRadius: 'var(--radio-m)'
  },
  botonFormulario: {
    flexShrink: 0
  },
  errorCampo: {
    marginTop: '8px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-peligro-texto)'
  },
  lista: {
    listStyle: 'none',
    margin: 0,
    padding: 0
  },
  fila: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid var(--color-borde)'
  },
  // Cuadrado con el número y el color del estado, igual que en el plano de sala
  muestra: {
    display: 'grid',
    placeItems: 'center',
    width: 'var(--toque)',
    height: 'var(--toque)',
    flexShrink: 0,
    borderRadius: 'var(--radio-s)',
    fontSize: '20px',
    fontWeight: 700
  },
  filaTexto: {
    flex: '1 1 160px',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '16px'
  },
  botonFila: {
    minHeight: 'var(--toque)',
    padding: '8px 16px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderRadius: 'var(--radio-m)',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  botonQuitar: {
    background: 'var(--color-superficie)',
    color: 'var(--color-peligro-texto)',
    borderColor: 'var(--color-peligro)'
  },
  botonPeligro: {
    background: 'var(--color-peligro)',
    color: '#ffffff',
    borderColor: 'var(--color-peligro)'
  },
  confirmacion: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px'
  },
  pregunta: {
    fontSize: '16px',
    fontWeight: 700
  }
};

export default AdminMesas;
