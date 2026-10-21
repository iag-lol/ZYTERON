export type WhatsappTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  parameter_format?: string;
  components: Array<{
    type: string;
    text?: string;
    format?: string;
    buttons?: Array<{ type: string; url?: string; text: string }>;
  }>;
};
export type TemplateField = {
  key: string;
  label: string;
  component: "header" | "body" | "button";
  parameter: string;
  index?: number;
  named: boolean;
};
export function templateFields(template: WhatsappTemplate) {
  const fields: TemplateField[] = [];
  for (const component of template.components) {
    const type = component.type.toLowerCase();
    if (type === "header" && component.format && component.format !== "TEXT")
      throw Error("Esta plantilla requiere un archivo. Elige una plantilla de texto.");
    if (["header", "body"].includes(type)) {
      for (const parameter of [
        ...new Set(
          [...String(component.text || "").matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]!),
        ),
      ]) {
        fields.push({
          key: `${type}:${parameter}`,
          label: `${type === "body" ? "Mensaje" : "Encabezado"} · ${parameter}`,
          component: type as "body" | "header",
          parameter,
          named: template.parameter_format === "NAMED",
        });
      }
    }
    if (type === "buttons")
      component.buttons?.forEach((button, index) => {
        if (button.type === "URL" && button.url?.includes("{{"))
          fields.push({
            key: `button:${index}`,
            label: `Enlace · ${button.text}`,
            component: "button",
            parameter: "1",
            index,
            named: false,
          });
        else if (!["URL", "PHONE_NUMBER", "QUICK_REPLY"].includes(button.type))
          throw Error("Esta plantilla requiere una acción especial. Elige una plantilla de texto.");
      });
  }
  return fields;
}
export function buildTemplateMessage(template: WhatsappTemplate, values: Record<string, string>) {
  if (template.status !== "APPROVED") throw Error("La plantilla no está aprobada.");
  const fields = templateFields(template);
  const components: Array<Record<string, unknown>> = [];
  for (const field of fields) {
    const value = values[field.key]?.trim();
    if (!value || value.length > 1000 || /[\r\n\t]/.test(value))
      throw Error(`Completa ${field.label} en una línea (máximo 1000 caracteres).`);
    const parameter = {
      type: "text",
      text: value,
      ...(field.named ? { parameter_name: field.parameter } : {}),
    };
    if (field.component === "button")
      components.push({
        type: "button",
        sub_type: "url",
        index: String(field.index),
        parameters: [parameter],
      });
    else {
      let group = components.find((c) => c.type === field.component);
      if (!group) {
        group = { type: field.component, parameters: [] };
        components.push(group);
      }
      (group.parameters as unknown[]).push(parameter);
    }
  }
  const preview = template.components
    .filter((c) => ["HEADER", "BODY", "FOOTER"].includes(c.type))
    .map((c) =>
      String(c.text || "").replace(
        /\{\{\s*(\w+)\s*\}\}/g,
        (_, parameter) => values[`${c.type.toLowerCase()}:${parameter}`] || `{{${parameter}}}`,
      ),
    )
    .filter(Boolean)
    .join("\n\n");
  return { components, preview };
}
