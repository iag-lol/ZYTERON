/**
 * Señal invisible que el backend del chat emite cuando el cliente ya está listo
 * (entregó sus datos / confirmó). El widget la detecta para recién ahí mostrar
 * el botón "Continuar por WhatsApp", y la elimina del texto visible.
 */
export const HANDOFF_SIGNAL = "⁣[[ZY_WA_READY]]⁣";
