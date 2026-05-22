export type ServicePaymentMode = "checkout" | "subscription";

export type ServicePaymentItem = {
  key: string;
  title: string;
  description: string;
  amount: number;
  mode: ServicePaymentMode;
  cta: string;
  priceLabel: string;
};

export const SERVICE_PAYMENT_ITEMS: ServicePaymentItem[] = [
  {
    key: "diagnostico_inicial",
    title: "Diagnóstico inicial ZYTERON",
    description:
      "Revisión inicial de requerimiento, recomendación de plan y estimación base. Se puede descontar si contratas el proyecto.",
    amount: 19990,
    mode: "checkout",
    cta: "Pagar diagnóstico",
    priceLabel: "Desde $19.990",
  },
  {
    key: "reserva_proyecto",
    title: "Reserva de proyecto",
    description:
      "Reserva cupo de inicio y preparación técnica inicial. Se descuenta del total del proyecto aprobado.",
    amount: 39990,
    mode: "checkout",
    cta: "Reservar proyecto",
    priceLabel: "Desde $39.990",
  },
  {
    key: "abono_inicial",
    title: "Abono inicial",
    description:
      "Pago inicial para iniciar proyecto aprobado por cotización. Se descuenta del total acordado.",
    amount: 80000,
    mode: "checkout",
    cta: "Pagar abono",
    priceLabel: "Desde $80.000",
  },
  {
    key: "plan_web_administrada_mensual",
    title: "Plan Web Administrada mensual",
    description:
      "Servicio mensual para presencia digital básica con soporte y mantención menor.",
    amount: 19990,
    mode: "subscription",
    cta: "Contratar mensualidad",
    priceLabel: "Desde $19.990/mes",
  },
  {
    key: "mantencion_mensual",
    title: "Mantención mensual",
    description: "Mantención técnica base y ajustes menores de contenido.",
    amount: 19990,
    mode: "checkout",
    cta: "Pagar mantención",
    priceLabel: "Desde $19.990/mes",
  },
  {
    key: "soporte_prioritario",
    title: "Soporte prioritario",
    description: "Atención prioritaria y gestión técnica avanzada según SLA.",
    amount: 34990,
    mode: "checkout",
    cta: "Pagar soporte prioritario",
    priceLabel: "Desde $34.990/mes",
  },
];

export function getServicePaymentItem(key: string) {
  return SERVICE_PAYMENT_ITEMS.find((item) => item.key === key) || null;
}
