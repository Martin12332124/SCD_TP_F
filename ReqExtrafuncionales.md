# Catálogo de Requisitos Extrafuncionales
## Sistema POS & KDS para Restaurante

---

| ID | Requisito | Métrica / Criterio de aceptación | Prioridad |
|----|-----------|-----------------------------------|-----------|
| RNF-01 | El envío de una comanda desde el POS debe reflejarse en el KDS en tiempo casi real. | Latencia máxima vía WebSocket: < 1 seg dentro de la LAN. | Alta |
| RNF-02 | El cambio de estado de un pedido (Azul→Verde→Morado) debe propagarse a todas las pantallas conectadas (mesero + KDS) sin refresco manual. | Actualización push automática, sin polling perceptible por el usuario. | Alta |
| RNF-03 | Los cronómetros de cocina (alertas 15/20 min) deben mantenerse precisos incluso con carga de múltiples pedidos simultáneos. | Desviación máxima del cronómetro: ± 2 seg. | Media |
| RNF-04 | El sistema debe soportar la operación simultánea de múltiples mesas/pedidos sin degradación visible. | Número esperado de mesas/pedidos concurrentes: 10. | Media |

