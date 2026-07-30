/**
 * PLANTILLAS CONTRACTUALES APROBADAS
 * ----------------------------------
 * Texto jurídico fijo. Vive en el código —versionado en git— y no en base
 * de datos, para que el contenido aprobado no pueda alterarse desde el
 * panel administrativo. La generación solo reemplaza las `{{variables}}`:
 * nunca reescribe, resume ni reordena cláusulas.
 *
 * Al modificar el texto hay que subir `version`. Cada contrato emitido
 * guarda con qué plantilla y versión se generó, de modo que siempre se
 * puede reconstruir qué decía el documento firmado.
 *
 * NOTA: el articulado es una base profesional para la operación de
 * Zyteron. Antes de usarlo en producción conviene una revisión legal que
 * confirme su ajuste a la normativa vigente y a la realidad de cada
 * vínculo.
 */

import type { ContractTypeId } from "@/config/contracts";

export type ContractClause = {
  /** Título de la cláusula, sin numerar: la numeración la pone el PDF. */
  title: string;
  paragraphs: string[];
};

export type ContractTemplate = {
  id: string;
  version: string;
  type: ContractTypeId;
  documentTitle: string;
  subtitle: string;
  /** Comparecencia de las partes. */
  appearance: string[];
  clauses: ContractClause[];
  /** Texto de cierre previo a las firmas. */
  closing: string[];
  bankAnnexTitle: string;
  bankAnnexIntro: string;
  bankAnnexNote: string;
};

const APPEARANCE_PARTIES = [
  "En {{ciudad}}, a {{fecha_contrato}}, entre {{razon_social_zyteron}}, RUT {{rut_zyteron}}, sociedad del giro de servicios informáticos, desarrollo de software y soluciones tecnológicas, domiciliada en {{domicilio_zyteron}}, comuna de {{comuna_zyteron}}, representada legalmente por don {{nombre_representante}}, cédula de identidad N° {{rut_representante}}, ambos con domicilio para estos efectos en el ya señalado, en adelante indistintamente «Zyteron» o «la Empresa»;",
  "y {{nombre_completo}}, cédula de identidad N° {{rut_prestador}}, con domicilio en {{domicilio_prestador}}, comuna de {{comuna_prestador}}, correo electrónico {{correo_personal}} y teléfono {{telefono}};",
];

/** Cierre de la comparecencia según el tipo de instrumento. */
const APPEARANCE_CONTRACT = [
  ...APPEARANCE_PARTIES.map((text) =>
    text.replace("y teléfono {{telefono}};", "y teléfono {{telefono}}, en adelante «el Prestador»;"),
  ),
  "se ha convenido el siguiente contrato:",
];

const APPEARANCE_AGREEMENT = [
  ...APPEARANCE_PARTIES.map((text) =>
    text.replace("y teléfono {{telefono}};", "y teléfono {{telefono}}, en adelante «el Partner»;"),
  ),
  "se ha convenido el siguiente convenio:",
];

// =====================================================================
// A · Ejecutivo Comercial Freelance
// =====================================================================

const EXECUTIVE_CLAUSES: ContractClause[] = [
  {
    title: "Objeto del servicio",
    paragraphs: [
      "El Prestador se obliga a prestar a Zyteron servicios comerciales independientes consistentes en la búsqueda, contacto, presentación y seguimiento de personas naturales o jurídicas que puedan requerir los servicios que la Empresa comercializa, con el objeto de que estas se conviertan en clientes de Zyteron.",
      "Los servicios se prestan a honorarios, sin vínculo de subordinación ni dependencia, en los términos que se detallan en el presente instrumento.",
    ],
  },
  {
    title: "Denominación funcional",
    paragraphs: [
      "Para efectos operativos y de identificación ante terceros, el Prestador podrá presentarse bajo la denominación funcional de «{{cargo_funcional}}».",
      "Esta denominación es únicamente descriptiva de la actividad que desarrolla y no constituye cargo, jerarquía, representación legal ni relación laboral con Zyteron.",
    ],
  },
  {
    title: "Naturaleza civil y comercial del vínculo",
    paragraphs: [
      "Las partes declaran que el presente contrato se rige por las normas del derecho común aplicables al arrendamiento de servicios inmateriales y por las disposiciones comerciales pertinentes, y que en caso alguno constituye contrato de trabajo.",
      "En consecuencia, no resultan aplicables al presente vínculo las disposiciones del Código del Trabajo relativas a remuneración, jornada, feriado, indemnizaciones ni terminación del contrato de trabajo.",
    ],
  },
  {
    title: "Ausencia de subordinación y dependencia",
    paragraphs: [
      "El Prestador desarrolla su actividad con plena autonomía técnica y organizativa. No se encuentra sujeto a órdenes, instrucciones permanentes, supervisión jerárquica, medidas disciplinarias ni potestad de mando alguna por parte de Zyteron.",
      "Las coordinaciones, lineamientos comerciales e información de productos que la Empresa entregue tienen por finalidad exclusiva asegurar la correcta representación de los servicios ofrecidos y la consistencia de la información entregada a los clientes, sin que ello importe subordinación.",
    ],
  },
  {
    title: "Libertad para organizar la actividad",
    paragraphs: [
      "El Prestador organiza libremente su actividad, define sus métodos de trabajo, su ruta comercial, la cantidad de contactos que gestiona y la forma de administrar su tiempo.",
      "El Prestador podrá prestar servicios a terceros, salvo que ello implique conflicto de interés directo con Zyteron conforme a la cláusula de límites de actuación.",
    ],
  },
  {
    title: "Ausencia de jornada, turnos y control de asistencia",
    paragraphs: [
      "No existe jornada de trabajo, horario de entrada o salida, turnos, marcaje ni control de asistencia de ninguna especie.",
      "El registro de gestiones en el portal comercial constituye únicamente respaldo de la actividad realizada para efectos de trazabilidad y cálculo de comisiones, y no constituye control horario.",
    ],
  },
  {
    title: "Medios propios",
    paragraphs: [
      "El Prestador ejecuta su actividad con medios propios. En particular, provee por su cuenta el computador, la conexión a internet, el teléfono móvil, el plan de datos y cualquier otro elemento necesario para el desarrollo de la prestación.",
      "Zyteron proporciona únicamente el acceso personal al portal comercial y, cuando corresponda, una casilla de correo corporativo, ambos de propiedad de la Empresa y destinados exclusivamente a la actividad objeto de este contrato.",
    ],
  },
  {
    title: "Registro de prospectos",
    paragraphs: [
      "Toda persona o empresa contactada deberá ser registrada por el Prestador en el portal comercial de Zyteron, con la información completa que el sistema requiera y en forma oportuna.",
      "El registro es la única fuente de acreditación de la gestión. Los contactos no registrados no generan derecho a comisión ni prioridad alguna.",
    ],
  },
  {
    title: "Validación de clientes",
    paragraphs: [
      "Zyteron revisará cada registro y lo clasificará según corresponda. Solo los registros clasificados por la Empresa como «cliente potencial» o «aceptado» habilitan la continuidad de la gestión y el eventual devengo de comisión.",
      "La clasificación es facultad exclusiva de Zyteron y se fundará en criterios comerciales, técnicos y de cartera.",
    ],
  },
  {
    title: "Clientes duplicados o preexistentes",
    paragraphs: [
      "No generarán comisión los contactos que ya se encuentren registrados en la cartera de Zyteron, que hayan sido previamente ingresados por otro prestador, o que mantengan o hayan mantenido relación comercial vigente con la Empresa.",
      "En caso de registros coincidentes prevalecerá el primero ingresado en el sistema, según fecha y hora del registro.",
      "El registro aceptado protege la gestión del Prestador respecto de ese contacto durante {{dias_cola_comisiones}} días corridos contados desde su aceptación, siempre que informe gestiones dentro de dicho plazo.",
    ],
  },
  {
    title: "Proceso comercial",
    paragraphs: [
      "El Prestador realizará el contacto inicial, levantará la necesidad del interesado y registrará cada gestión en el portal comercial.",
      "La propuesta formal, con su alcance, plazos y condiciones, será elaborada y emitida exclusivamente por Zyteron. El Prestador la presentará al interesado y resolverá las consultas que se le formulen dentro del marco de la información entregada por la Empresa.",
    ],
  },
  {
    title: "Límites de actuación",
    paragraphs: [
      "El Prestador no ostenta la representación legal ni convencional de Zyteron y no podrá obligarla frente a terceros.",
      "En particular, le está prohibido celebrar contratos a nombre de la Empresa, comprometer precios, descuentos, plazos, alcances o funcionalidades no autorizadas por escrito, y suscribir cualquier instrumento en representación de Zyteron.",
      "El Prestador se abstendrá de contactar clientes activos de la cartera de la Empresa sin coordinación previa.",
    ],
  },
  {
    title: "Prohibición de recibir dineros",
    paragraphs: [
      "Queda expresamente prohibido al Prestador recibir dinero, transferencias, anticipos, abonos o cualquier pago de clientes o interesados, sea en efectivo, en cuentas propias o de terceros.",
      "Todo pago deberá efectuarse directamente a Zyteron, en las cuentas que la Empresa informe, y contra el documento tributario correspondiente. La infracción a esta cláusula constituye incumplimiento grave.",
    ],
  },
  {
    title: "Cotizaciones y documentos oficiales",
    paragraphs: [
      "El Prestador no podrá emitir cotizaciones, propuestas, órdenes de trabajo ni documentos oficiales a nombre de Zyteron sin autorización previa y por escrito de la Empresa.",
      "Podrá orientar al interesado con los valores referenciales publicados por Zyteron, dejando constancia de que son referenciales, que no incluyen impuestos y que la cotización formal la emite la Empresa.",
    ],
  },
  {
    title: "Comisión",
    paragraphs: [
      "Como única contraprestación por los servicios, Zyteron pagará al Prestador una comisión equivalente al {{porcentaje_comision}}% calculada sobre la base definida en la cláusula siguiente.",
      "El Prestador no percibirá sueldo base, renta fija, viáticos, asignaciones ni beneficio de naturaleza laboral alguno.",
    ],
  },
  {
    title: "Base neta comisionable",
    paragraphs: [
      "La base de cálculo será el {{base_comision}}, entendiéndose por tal el monto efectivamente pagado por el cliente, excluido el Impuesto al Valor Agregado.",
      "Se descontarán de la base los montos correspondientes a servicios de terceros, licencias, dominios, hosting, mensajería, consumo de modelos de inteligencia artificial, medios de pago y cualquier costo externo que Zyteron deba transferir a un proveedor.",
    ],
  },
  {
    title: "Pagos parciales",
    paragraphs: [
      "Cuando el proyecto se cobre por etapas, la comisión se devengará en la misma proporción en que el cliente efectúe cada pago.",
      "No se devengará comisión respecto de montos facturados y no percibidos por Zyteron.",
    ],
  },
  {
    title: "Devoluciones y contracargos",
    paragraphs: [
      "Si el cliente obtiene la devolución total o parcial de lo pagado, o si se produce un contracargo, anulación o reverso del pago, la comisión asociada se dejará sin efecto en la misma proporción.",
      "Si la comisión ya hubiere sido pagada, el monto correspondiente se descontará de las liquidaciones siguientes.",
    ],
  },
  {
    title: "Estado mensual de comisiones",
    paragraphs: [
      "Zyteron emitirá mensualmente una liquidación con el detalle de las comisiones devengadas en el período, indicando base de cálculo, porcentaje aplicado, retención y monto neto.",
      "La liquidación quedará disponible en el portal comercial. El Prestador dispondrá de 10 días corridos desde su emisión para formular observaciones; transcurrido dicho plazo sin objeciones, se tendrá por aceptada.",
    ],
  },
  {
    title: "Documentación tributaria",
    paragraphs: [
      "El Prestador deberá emitir la boleta de honorarios electrónica correspondiente por cada liquidación, como condición previa al pago.",
      "El Prestador es el único responsable del cumplimiento de sus obligaciones tributarias y previsionales derivadas de los honorarios percibidos.",
    ],
  },
  {
    title: "Retención de impuesto",
    paragraphs: [
      "Zyteron practicará la retención de impuesto de segunda categoría que corresponda conforme a la tasa vigente al momento del pago, actualmente {{retencion_vigente}}%, y la enterará en arcas fiscales en los plazos legales.",
      "La variación legal de la tasa se aplicará automáticamente, sin necesidad de modificar este contrato.",
    ],
  },
  {
    title: "Forma de pago",
    paragraphs: [
      "El pago se efectuará mediante transferencia electrónica a la cuenta bancaria individualizada en el anexo del presente contrato, dentro de los 10 días hábiles siguientes a la recepción conforme de la boleta de honorarios.",
      "El Prestador deberá mantener actualizados sus datos bancarios en el portal comercial. Zyteron no responderá por transferencias efectuadas a cuentas informadas erróneamente por el Prestador.",
    ],
  },
  {
    title: "Confidencialidad",
    paragraphs: [
      "El Prestador se obliga a mantener estricta reserva sobre la información comercial, técnica, financiera, de clientes, precios, márgenes, metodologías y cualquier antecedente de Zyteron al que acceda con ocasión de este contrato.",
      "Esta obligación se mantendrá vigente durante toda la relación y por un plazo de 3 años contados desde su término, cualquiera sea la causa.",
    ],
  },
  {
    title: "Protección de datos personales",
    paragraphs: [
      "El Prestador tratará los datos personales de contactos y clientes exclusivamente para los fines de este contrato, conforme a la normativa vigente sobre protección de la vida privada.",
      "Le está prohibido copiar, exportar, comercializar, ceder o utilizar dichos datos para fines propios o de terceros. Al término del contrato deberá cesar todo tratamiento y eliminar las copias que mantenga.",
    ],
  },
  {
    title: "Correo corporativo",
    paragraphs: [
      "Cuando Zyteron asigne una casilla de correo corporativo, esta es de propiedad de la Empresa y se destina exclusivamente a la actividad objeto de este contrato.",
      "La Empresa podrá suspenderla o cerrarla al término de la relación. Las comunicaciones de carácter contractual se dirigirán al correo personal del Prestador individualizado en la comparecencia.",
    ],
  },
  {
    title: "Portal comercial",
    paragraphs: [
      "El acceso al portal comercial es personal e intransferible. El Prestador es responsable de la custodia de sus credenciales y de toda actuación registrada con su usuario.",
      "Zyteron podrá suspender el acceso en caso de incumplimiento grave, uso indebido o término del contrato.",
    ],
  },
  {
    title: "Propiedad intelectual",
    paragraphs: [
      "Todo material, metodología, base de datos, desarrollo, documentación y contenido proporcionado por Zyteron o generado con ocasión de este contrato es de propiedad exclusiva de la Empresa.",
      "El presente contrato no transfiere al Prestador derecho alguno sobre dichos elementos.",
    ],
  },
  {
    title: "Uso de la marca",
    paragraphs: [
      "El Prestador podrá identificarse como {{cargo_funcional}} de Zyteron exclusivamente en el ejercicio de la actividad objeto de este contrato.",
      "No podrá utilizar la marca, el logotipo, el nombre comercial ni los signos distintivos de Zyteron en piezas publicitarias, perfiles, sitios web, redes sociales ni material propio sin autorización previa y por escrito de la Empresa.",
    ],
  },
  {
    title: "Vigencia",
    paragraphs: [
      "El presente contrato rige a contar del {{fecha_inicio}} y tendrá una duración {{vigencia}}.",
    ],
  },
  {
    title: "Término",
    paragraphs: [
      "Cualquiera de las partes podrá poner término al contrato, sin expresión de causa y sin derecho a indemnización de ninguna naturaleza, dando aviso por escrito a la otra con a lo menos {{dias_aviso_termino}} días corridos de anticipación.",
      "Zyteron podrá ponerle término de inmediato, sin necesidad de aviso previo, en caso de incumplimiento grave, en especial la recepción de dineros de clientes, la infracción a la confidencialidad, el uso indebido de datos personales o la comisión de actos que afecten la reputación de la Empresa.",
    ],
  },
  {
    title: "Comisiones posteriores al término",
    paragraphs: [
      "Terminado el contrato, el Prestador conservará el derecho a percibir las comisiones correspondientes a negocios cerrados y pagados por el cliente dentro de los {{dias_cola_comisiones}} días corridos siguientes al término, siempre que el registro respectivo hubiere sido aceptado por Zyteron con anterioridad.",
      "Transcurrido dicho plazo cesará todo derecho a comisión, sin necesidad de declaración alguna.",
    ],
  },
  {
    title: "Domicilio y jurisdicción",
    paragraphs: [
      "Para todos los efectos derivados del presente contrato, las partes fijan domicilio en la ciudad de Santiago y se someten a la competencia de sus Tribunales Ordinarios de Justicia.",
    ],
  },
  {
    title: "Firma electrónica y comunicaciones",
    paragraphs: [
      "Las partes acuerdan que el presente contrato podrá suscribirse mediante firma electrónica, reconociéndole plena validez y eficacia conforme a la Ley N° 19.799 sobre documentos electrónicos y firma electrónica.",
      "Las comunicaciones entre las partes se entenderán válidamente efectuadas por correo electrónico a las direcciones individualizadas en la comparecencia.",
    ],
  },
  {
    title: "Ejemplares",
    paragraphs: [
      "El presente contrato se firma en dos ejemplares de idéntico tenor y fecha, quedando uno en poder de cada parte.",
    ],
  },
];

// =====================================================================
// B · Partner o Referidor Independiente
// =====================================================================

const PARTNER_CLAUSES: ContractClause[] = [
  {
    title: "Objeto del convenio",
    paragraphs: [
      "El Partner se obliga a buscar, prospectar y contactar personas naturales o jurídicas que puedan requerir los servicios que Zyteron comercializa, presentarles dichos servicios utilizando exclusivamente la información y el material previamente aprobados por la Empresa, identificar sus necesidades comerciales, efectuar el seguimiento correspondiente, registrar las oportunidades en el portal comercial y coordinar al interesado con Zyteron.",
      "El contacto podrá efectuarse por correo electrónico, teléfono, mensajería instantánea u otros medios lícitos.",
      "La elaboración de la propuesta definitiva, la negociación de condiciones especiales, la aprobación de descuentos, la contratación y el cierre corresponden exclusivamente a Zyteron.",
    ],
  },
  {
    title: "Denominación funcional",
    paragraphs: [
      "Para efectos operativos y de identificación ante terceros, el Partner podrá identificarse como «{{cargo_funcional}}».",
      "Esta denominación es meramente funcional y descriptiva de la actividad que desarrolla. No constituye contrato de trabajo, mandato, representación legal ni facultad alguna para obligar a Zyteron frente a terceros.",
      "El Partner deberá aclarar su condición de independiente cuando el interesado pudiere entender lo contrario.",
    ],
  },
  {
    title: "Naturaleza civil y comercial del vínculo",
    paragraphs: [
      "El presente convenio se rige por las normas del derecho común y comercial aplicables, y en caso alguno constituye contrato de trabajo ni genera relación laboral entre las partes.",
      "No resultan aplicables a este vínculo las disposiciones del Código del Trabajo relativas a remuneración, jornada, feriado, indemnizaciones ni terminación del contrato de trabajo.",
    ],
  },
  {
    title: "Ausencia de subordinación y dependencia",
    paragraphs: [
      "El Partner actúa con plena autonomía técnica y organizativa. No está sujeto a órdenes, instrucciones permanentes, supervisión jerárquica, metas obligatorias ni potestad disciplinaria de Zyteron.",
      "La información de productos y los lineamientos comerciales que la Empresa entregue tienen por única finalidad asegurar que los servicios se presenten con exactitud, sin que ello importe subordinación.",
    ],
  },
  {
    title: "Autonomía, jornada y exclusividad",
    paragraphs: [
      "El Partner organiza libremente su actividad, sus métodos, su ruta comercial y la administración de su tiempo. No existe jornada, horario, turnos, marcaje ni control de asistencia de ninguna especie.",
      "El registro de gestiones en el portal comercial constituye únicamente respaldo de la actividad para efectos de trazabilidad y cálculo de comisiones, y no constituye control horario.",
      "El convenio no es exclusivo: el Partner podrá desarrollar otras actividades, salvo que ello importe conflicto de interés directo con Zyteron.",
    ],
  },
  {
    title: "Medios propios",
    paragraphs: [
      "El Partner ejecuta su actividad con medios propios, incluidos el computador, la conexión a internet, el teléfono móvil y el plan de datos.",
      "Zyteron proporciona únicamente el acceso personal al portal comercial y, cuando corresponda, una casilla de correo corporativo, ambos de propiedad de la Empresa y destinados exclusivamente a la actividad objeto de este convenio.",
    ],
  },
  {
    title: "Registro de oportunidades",
    paragraphs: [
      "Todo interesado deberá ser registrado por el Partner en el portal comercial en forma oportuna, con la información veraz y completa que el sistema requiera. El portal deja constancia automática de la fecha y hora de ingreso de cada registro.",
      "El registro en el portal es la única forma de acreditar la gestión. Los contactos no registrados no generan derecho a comisión ni prioridad alguna.",
    ],
  },
  {
    title: "Aceptación o rechazo del referido",
    paragraphs: [
      "Zyteron revisará cada registro y lo aceptará o lo rechazará. Únicamente el estado «referido aceptado» habilita el eventual devengo de comisión conforme a este convenio.",
      "Cuando Zyteron rechace un registro deberá indicar una razón básica del rechazo, la que quedará disponible para el Partner en el portal comercial.",
      "La decisión es facultad de Zyteron y se fundará en criterios comerciales, técnicos y de cartera.",
    ],
  },
  {
    title: "Referidos duplicados o preexistentes",
    paragraphs: [
      "No generarán comisión los interesados que ya se encuentren registrados en la cartera de Zyteron, que hayan sido ingresados previamente por otro Partner, o que mantengan o hayan mantenido relación comercial con la Empresa.",
      "En caso de registros coincidentes prevalecerá el primer registro válido ingresado en el sistema, según la fecha y hora que conste en el portal.",
    ],
  },
  {
    title: "Atribución comercial",
    paragraphs: [
      "El referido aceptado quedará asociado al Partner durante {{dias_cola_comisiones}} días corridos contados desde la fecha de su aceptación.",
      "Si dentro de ese plazo el interesado contrata con Zyteron, el Partner conservará íntegramente el derecho a la comisión correspondiente a ese contrato inicial, aunque uno o más pagos se reciban con posterioridad al vencimiento del plazo de atribución.",
      "El plazo de atribución determina hasta cuándo un referido aceptado sigue asociado al Partner, y no debe confundirse con las fechas en que el cliente efectúa los pagos del proyecto.",
      "Este es el único plazo de atribución aplicable al presente convenio.",
    ],
  },
  {
    title: "Límites de actuación",
    paragraphs: [
      "El Partner no representa legal ni convencionalmente a Zyteron y no puede obligarla frente a terceros.",
      "En particular, le está prohibido firmar contratos en nombre de la Empresa, emitir cotizaciones por cuenta propia, modificar o comprometer precios, descuentos, plazos, alcances, funcionalidades o fechas de entrega, prometer resultados sin autorización y utilizar piezas publicitarias no aprobadas.",
      "El Partner podrá orientar al interesado con los valores referenciales publicados por Zyteron, dejando constancia de que son referenciales, que no incluyen impuestos y que la cotización formal la emite la Empresa.",
    ],
  },
  {
    title: "Prohibición de recibir dineros",
    paragraphs: [
      "Queda expresamente prohibido al Partner recibir dinero, transferencias, anticipos o pagos de clientes o interesados, sea en efectivo, en cuentas propias o de terceros.",
      "Todo pago se efectúa directamente a Zyteron, en las cuentas que la Empresa informe y contra el documento tributario correspondiente. La infracción a esta cláusula constituye incumplimiento grave.",
    ],
  },
  {
    title: "Comisión",
    paragraphs: [
      "Zyteron pagará al Partner una comisión bruta equivalente al {{porcentaje_comision}}% por cada referido aceptado que resulte contratado y efectivamente pagado.",
      "El Partner no percibirá sueldo base, renta fija, viáticos, asignaciones ni beneficio de naturaleza laboral alguno. La comisión es la única contraprestación pactada.",
    ],
  },
  {
    title: "Base neta comisionable",
    paragraphs: [
      "La comisión se calcula sobre el {{base_comision}}, entendiéndose por tal el monto efectivamente percibido por la Empresa, excluido el Impuesto al Valor Agregado.",
      "Se excluyen de la base los montos correspondientes a dominios, hosting, licencias, mensajería, servicios de terceros, consumo de inteligencia artificial, comisiones de medios de pago y cualquier otro costo externo pagado a proveedores.",
      "Cuando el cliente pague por etapas, la comisión se devengará proporcionalmente con cada pago recibido. No se devenga comisión sobre montos facturados y no pagados.",
      "A modo de ejemplo: si la base neta comisionable efectivamente recibida asciende a {{ejemplo_base_comisionable}}, la comisión bruta será de {{ejemplo_comision_bruta}}, monto sobre el cual se aplicará la retención tributaria vigente.",
    ],
  },
  {
    title: "Alcance de la comisión y ventas posteriores",
    paragraphs: [
      "La comisión comprende exclusivamente el contrato, proyecto o venta inicial originada por el referido aceptado.",
      "Tratándose de servicios de suscripción, la comisión se aplicará únicamente al primer pago, salvo acuerdo comercial individual y escrito que establezca una condición distinta.",
      "No se generan automáticamente comisiones por renovaciones, mantenciones, mensualidades posteriores, ampliaciones, ventas adicionales ni nuevos proyectos del mismo cliente.",
      "Una venta adicional solo generará comisión cuando sea registrada como una nueva oportunidad en el portal y aceptada expresamente por Zyteron.",
    ],
  },
  {
    title: "Devoluciones y contracargos",
    paragraphs: [
      "Si el cliente obtiene la devolución total o parcial de lo pagado, o si se produce un contracargo, anulación o reverso del pago, se dejará sin efecto exactamente la comisión asociada al monto devuelto.",
      "Si dicha comisión ya hubiere sido pagada, el descuento se aplicará sobre las liquidaciones siguientes. De no existir liquidaciones futuras, las partes acordarán la forma de restitución del monto correspondiente.",
    ],
  },
  {
    title: "Liquidación mensual",
    paragraphs: [
      "Zyteron emitirá mensualmente una liquidación con el detalle de las comisiones devengadas en el período, indicando base de cálculo, porcentaje aplicado, retención y monto neto. La liquidación quedará disponible en el portal comercial.",
      "El Partner dispondrá de 10 días corridos desde su emisión para formular observaciones; transcurrido dicho plazo sin objeciones, se tendrá por aceptada.",
    ],
  },
  {
    title: "Documentación tributaria y pago",
    paragraphs: [
      "El Partner deberá emitir la Boleta de Honorarios Electrónica correspondiente a la comisión bruta liquidada, utilizando la opción en que la retención es efectuada por Zyteron en su calidad de receptor del documento.",
      "Zyteron practicará y enterará en arcas fiscales la retención de impuestos a la tasa legal vigente al momento del pago (durante el año {{anio_retencion}}, {{retencion_vigente}}%). La variación legal de la tasa se aplicará automáticamente, sin necesidad de modificar este convenio.",
      "El monto transferido al Partner corresponderá a la comisión bruta menos la retención legal.",
      "El pago se efectuará mediante transferencia electrónica a la cuenta individualizada en el anexo, dentro de los 10 días hábiles siguientes a la recepción conforme de la boleta.",
      "El Partner es el único responsable del cumplimiento de sus obligaciones tributarias y previsionales, y deberá mantener actualizados sus datos bancarios en el portal comercial.",
    ],
  },
  {
    title: "Confidencialidad",
    paragraphs: [
      "El Partner mantendrá estricta reserva sobre la información comercial, técnica, financiera, de clientes, precios y márgenes de Zyteron a la que acceda con ocasión de este convenio.",
      "La obligación se mantiene durante toda la relación y por 3 años contados desde su término, cualquiera sea la causa.",
    ],
  },
  {
    title: "Origen lícito de los datos",
    paragraphs: [
      "El Partner solo podrá registrar datos personales obtenidos lícitamente, y deberá asegurarse de que el interesado haya autorizado ser contactado por Zyteron o tenga una expectativa razonable de recibir un contacto comercial.",
      "Le está expresamente prohibido ingresar bases de datos compradas, extraídas ilegalmente o recopiladas masivamente sin autorización.",
    ],
  },
  {
    title: "Tratamiento de datos personales",
    paragraphs: [
      "El Partner tratará los datos personales de los interesados exclusivamente para los fines de este convenio. No podrá copiarlos, venderlos, exportarlos, cederlos ni utilizarlos para fines distintos.",
      "Al término del convenio deberá cesar todo tratamiento y eliminar cualquier copia que mantenga en su poder.",
      "Zyteron tratará dichos datos conforme a la normativa chilena vigente sobre protección de datos personales.",
    ],
  },
  {
    title: "Portal comercial y credenciales",
    paragraphs: [
      "El acceso al portal comercial es personal e intransferible. El Partner es responsable de la custodia de sus credenciales y de toda actuación registrada con su usuario.",
      "Zyteron podrá suspender el acceso en caso de incumplimiento grave, uso indebido o término del convenio.",
    ],
  },
  {
    title: "Uso de la marca y material comercial",
    paragraphs: [
      "El Partner podrá utilizar únicamente el correo corporativo, las credenciales, la firma de correo, las presentaciones y las piezas comerciales que Zyteron le autorice.",
      "No podrá modificar el logotipo ni los signos distintivos de la Empresa, ni crear promociones, publicidad o material propio que utilice la marca Zyteron, sin autorización previa y por escrito.",
      "Todo material, metodología y contenido proporcionado por Zyteron es de su propiedad exclusiva y este convenio no transfiere derecho alguno sobre ellos.",
    ],
  },
  {
    title: "Vigencia",
    paragraphs: [
      "El presente convenio rige a contar del {{fecha_inicio}} y tendrá una duración {{vigencia}}.",
    ],
  },
  {
    title: "Término",
    paragraphs: [
      "Cualquiera de las partes podrá poner término al convenio, sin expresión de causa y sin derecho a indemnización de ninguna naturaleza, dando aviso por escrito a la otra con a lo menos {{dias_aviso_termino}} días corridos de anticipación.",
      "Zyteron podrá ponerle término de inmediato, sin necesidad de aviso previo, en caso de incumplimiento grave, en especial la recepción de dineros de clientes, la emisión de cotizaciones no autorizadas, la infracción a la confidencialidad, el uso ilícito de datos personales o la atribución de una representación que no ostenta.",
      "Terminado el convenio, los referidos aceptados con anterioridad conservarán el período de atribución que les reste conforme a la cláusula de atribución comercial, y las comisiones que se devenguen dentro de dicho período se pagarán en los términos aquí pactados.",
    ],
  },
  {
    title: "Domicilio y jurisdicción",
    paragraphs: [
      "Para todos los efectos derivados del presente convenio, las partes fijan domicilio en la ciudad de Santiago y se someten a la competencia de sus Tribunales Ordinarios de Justicia.",
    ],
  },
  {
    title: "Firma electrónica y comunicaciones",
    paragraphs: [
      "Las partes acuerdan que el presente convenio podrá suscribirse mediante firma electrónica, reconociéndole plena validez y eficacia conforme a la Ley N° 19.799 sobre documentos electrónicos y firma electrónica.",
      "Las comunicaciones entre las partes se entenderán válidamente efectuadas por correo electrónico a las direcciones individualizadas en la comparecencia.",
    ],
  },
  {
    title: "Integridad del convenio",
    paragraphs: [
      "El presente convenio y sus anexos contienen el acuerdo completo entre las partes respecto de la materia que regulan, y reemplazan cualquier acuerdo, oferta o comunicación anterior, verbal o escrita.",
      "Toda modificación deberá constar por escrito o mediante aceptación electrónica verificable de ambas partes.",
    ],
  },
  {
    title: "Separabilidad",
    paragraphs: [
      "Si alguna disposición de este convenio fuere declarada nula, inválida o inexigible, las demás mantendrán plena vigencia. Las partes procurarán reemplazar la disposición afectada por otra válida que refleje su intención original.",
    ],
  },
  {
    title: "Ejemplares",
    paragraphs: [
      "El presente convenio se firma en dos ejemplares de idéntico tenor y fecha, quedando uno en poder de cada parte.",
    ],
  },
];

const BANK_ANNEX_NOTE =
  "Los datos bancarios individualizados fueron informados por el titular y se utilizan exclusivamente para el pago de las comisiones devengadas. Cualquier modificación deberá comunicarse por escrito y actualizarse en el portal comercial antes de la liquidación siguiente. Zyteron no almacena claves ni credenciales bancarias.";

export const CONTRACT_TEMPLATES: Record<ContractTypeId, ContractTemplate> = {
  executive_services: {
    id: "zyteron-ejecutivo-comercial-freelance",
    version: "1.1.0",
    type: "executive_services",
    documentTitle: "CONTRATO DE PRESTACIÓN DE SERVICIOS COMERCIALES INDEPENDIENTES",
    subtitle: "Cargo funcional: {{cargo_funcional}}",
    appearance: APPEARANCE_CONTRACT,
    clauses: EXECUTIVE_CLAUSES,
    closing: [
      "Leído por ambas partes y en señal de plena aceptación de todas y cada una de las cláusulas precedentes, firman:",
    ],
    bankAnnexTitle: "ANEXO A · DATOS BANCARIOS PARA EL PAGO DE COMISIONES",
    bankAnnexIntro:
      "Forma parte integrante del presente contrato el siguiente anexo, en el que se individualiza la cuenta bancaria destinada al pago de las comisiones:",
    bankAnnexNote: BANK_ANNEX_NOTE,
  },
  partner_agreement: {
    id: "zyteron-partner-referidor",
    version: "2.0.0",
    type: "partner_agreement",
    documentTitle: "CONVENIO DE COLABORACIÓN COMERCIAL INDEPENDIENTE",
    subtitle: "Denominación funcional: {{cargo_funcional}}",
    appearance: APPEARANCE_AGREEMENT,
    clauses: PARTNER_CLAUSES,
    closing: [
      "Leído por ambas partes y en señal de plena aceptación de todas y cada una de las cláusulas precedentes, firman:",
    ],
    bankAnnexTitle: "ANEXO A · DATOS BANCARIOS PARA EL PAGO DE COMISIONES",
    bankAnnexIntro:
      "Forma parte integrante del presente convenio el siguiente anexo, en el que se individualiza la cuenta bancaria destinada al pago de las comisiones del Partner:",
    bankAnnexNote: BANK_ANNEX_NOTE,
  },
};

/** Resumen de condiciones esenciales que se imprime bajo la comparecencia. */
export const ESSENTIAL_TERMS_LABELS: Array<{ label: string; variable: string }> = [
  { label: "Comisión", variable: "porcentaje_comision" },
  { label: "Base de cálculo", variable: "base_comision" },
  { label: "Vigencia", variable: "vigencia" },
  { label: "Aviso de término", variable: "dias_aviso_termino" },
  { label: "Comisiones posteriores", variable: "dias_cola_comisiones" },
  { label: "Cargo funcional", variable: "cargo_funcional" },
];
