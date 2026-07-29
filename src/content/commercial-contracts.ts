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

const APPEARANCE_COMMON = [
  "En {{ciudad}}, a {{fecha_contrato}}, entre {{razon_social_zyteron}}, RUT {{rut_zyteron}}, sociedad del giro de servicios informáticos, desarrollo de software y soluciones tecnológicas, domiciliada en {{domicilio_zyteron}}, comuna de {{comuna_zyteron}}, representada legalmente por don {{nombre_representante}}, cédula de identidad N° {{rut_representante}}, ambos con domicilio para estos efectos en el ya señalado, en adelante indistintamente «Zyteron» o «la Empresa»;",
  "y {{nombre_completo}}, cédula de identidad N° {{rut_prestador}}, con domicilio en {{domicilio_prestador}}, comuna de {{comuna_prestador}}, correo electrónico {{correo_personal}} y teléfono {{telefono}}, en adelante «el Prestador»;",
  "se ha convenido el siguiente contrato:",
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
    title: "Domicilio",
    paragraphs: [
      "Para todos los efectos legales derivados del presente contrato, las partes fijan su domicilio en la comuna y ciudad de {{ciudad}}.",
    ],
  },
  {
    title: "Jurisdicción",
    paragraphs: [
      "Cualquier dificultad o controversia que se produzca entre las partes respecto de la aplicación, interpretación, cumplimiento o validez de este contrato será sometida al conocimiento de los Tribunales Ordinarios de Justicia con asiento en la ciudad de {{ciudad}}.",
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
      "El Partner se obliga a presentar a Zyteron personas naturales o jurídicas que puedan requerir los servicios que la Empresa comercializa, mediante el registro de referidos en el portal comercial.",
      "La labor del Partner se limita a la referencia y presentación del interesado. La evaluación, la elaboración de la propuesta, la negociación y el cierre comercial son de cargo exclusivo de Zyteron.",
    ],
  },
  {
    title: "Denominación funcional",
    paragraphs: [
      "El Partner podrá presentarse bajo la denominación funcional de «{{cargo_funcional}}», la que es meramente descriptiva y no constituye cargo, representación ni relación laboral con Zyteron.",
    ],
  },
  {
    title: "Naturaleza civil y comercial del vínculo",
    paragraphs: [
      "El presente convenio se rige por las normas del derecho común y comercial aplicables, y en caso alguno constituye contrato de trabajo ni genera relación laboral entre las partes.",
    ],
  },
  {
    title: "Ausencia de subordinación y dependencia",
    paragraphs: [
      "El Partner actúa con plena autonomía. No está sujeto a órdenes, instrucciones permanentes, supervisión jerárquica, metas obligatorias ni potestad disciplinaria de Zyteron.",
    ],
  },
  {
    title: "Ausencia de jornada y de exclusividad",
    paragraphs: [
      "No existe jornada, horario, turnos ni control de asistencia. El Partner determina libremente cuándo y con qué intensidad desarrolla su actividad.",
      "El convenio no es exclusivo: el Partner podrá mantener otras actividades, salvo conflicto de interés directo con Zyteron.",
    ],
  },
  {
    title: "Medios propios",
    paragraphs: [
      "El Partner desarrolla su actividad con medios propios, incluidos computador, conexión a internet y teléfono. Zyteron provee únicamente el acceso al portal comercial.",
    ],
  },
  {
    title: "Registro de referidos",
    paragraphs: [
      "Todo referido deberá registrarse en el portal comercial con la información que el sistema requiera, en forma oportuna y veraz.",
      "El registro es la única forma de acreditar la referencia. Los contactos no registrados no generan derecho alguno.",
    ],
  },
  {
    title: "Validación de referidos",
    paragraphs: [
      "Zyteron revisará y clasificará cada referido. Solo los clasificados como «cliente potencial» o «aceptado» habilitan el eventual devengo de comisión.",
      "La clasificación es facultad exclusiva de la Empresa.",
    ],
  },
  {
    title: "Referidos duplicados o preexistentes",
    paragraphs: [
      "No generarán comisión los referidos que ya se encuentren en la cartera de Zyteron, que hubieren sido ingresados previamente por otra persona, o que mantengan o hayan mantenido relación comercial con la Empresa.",
      "En caso de coincidencia prevalecerá el primer registro ingresado en el sistema.",
      "El referido aceptado queda asociado al Partner por {{dias_cola_comisiones}} días corridos contados desde su aceptación.",
    ],
  },
  {
    title: "Límites de actuación",
    paragraphs: [
      "El Partner no representa legal ni convencionalmente a Zyteron y no puede obligarla frente a terceros.",
      "En particular, le está prohibido emitir cotizaciones, comprometer precios, descuentos, plazos, alcances o funcionalidades, y prometer fechas de entrega o resultados.",
      "El Partner deberá abstenerse de presentarse como ejecutivo, empleado o representante de la Empresa.",
    ],
  },
  {
    title: "Prohibición de recibir dineros",
    paragraphs: [
      "Queda expresamente prohibido al Partner recibir dinero, transferencias, anticipos o pagos de clientes o interesados, por cualquier vía.",
      "Todo pago se efectúa directamente a Zyteron contra el documento tributario correspondiente. La infracción constituye incumplimiento grave.",
    ],
  },
  {
    title: "Comisión",
    paragraphs: [
      "Zyteron pagará al Partner una comisión equivalente al {{porcentaje_comision}}% por cada referido que resulte validado, contratado y efectivamente pagado.",
      "El Partner no percibirá renta fija, sueldo base ni beneficio de naturaleza laboral alguno.",
    ],
  },
  {
    title: "Base neta comisionable",
    paragraphs: [
      "La base de cálculo será el {{base_comision}}, excluido el Impuesto al Valor Agregado.",
      "Se descontarán los montos correspondientes a servicios de terceros, licencias, dominios, hosting, mensajería, consumo de inteligencia artificial, medios de pago y cualquier costo externo transferido a un proveedor.",
    ],
  },
  {
    title: "Condición de pago y pagos parciales",
    paragraphs: [
      "La comisión se devenga únicamente una vez que el cliente ha pagado efectivamente a Zyteron. Cuando el proyecto se cobre por etapas, se devengará en la misma proporción de cada pago recibido.",
      "No se devengará comisión respecto de montos facturados y no percibidos.",
    ],
  },
  {
    title: "Devoluciones y contracargos",
    paragraphs: [
      "Si el cliente obtiene devolución total o parcial, o si se produce contracargo o reverso del pago, la comisión se dejará sin efecto en la misma proporción y, de haberse pagado, se descontará de liquidaciones posteriores.",
    ],
  },
  {
    title: "Liquidación mensual y documentación tributaria",
    paragraphs: [
      "Zyteron emitirá mensualmente una liquidación con el detalle de las comisiones devengadas, disponible en el portal comercial.",
      "El Partner deberá emitir la boleta de honorarios electrónica correspondiente como condición previa al pago, y es el único responsable de sus obligaciones tributarias.",
      "Zyteron practicará la retención de impuesto de segunda categoría vigente, actualmente {{retencion_vigente}}%.",
    ],
  },
  {
    title: "Forma de pago",
    paragraphs: [
      "El pago se efectuará por transferencia electrónica a la cuenta individualizada en el anexo, dentro de los 10 días hábiles siguientes a la recepción conforme de la boleta de honorarios.",
      "El Partner deberá mantener actualizados sus datos bancarios en el portal comercial.",
    ],
  },
  {
    title: "Confidencialidad",
    paragraphs: [
      "El Partner mantendrá estricta reserva sobre la información comercial, técnica, financiera y de clientes de Zyteron a la que acceda con ocasión de este convenio.",
      "La obligación se mantiene durante toda la relación y por 3 años contados desde su término.",
    ],
  },
  {
    title: "Protección de datos personales",
    paragraphs: [
      "El Partner tratará los datos personales de los referidos exclusivamente para los fines de este convenio y conforme a la normativa vigente.",
      "Le está prohibido copiar, exportar, comercializar o ceder dichos datos. Al término del convenio deberá cesar todo tratamiento y eliminar las copias que mantenga.",
    ],
  },
  {
    title: "Portal comercial",
    paragraphs: [
      "El acceso al portal comercial es personal e intransferible. El Partner responde de toda actuación registrada con su usuario.",
      "Zyteron podrá suspenderlo en caso de incumplimiento o término del convenio.",
    ],
  },
  {
    title: "Propiedad intelectual y uso de marca",
    paragraphs: [
      "Todo material, metodología y contenido proporcionado por Zyteron es de su propiedad exclusiva y este convenio no transfiere derecho alguno sobre ellos.",
      "El Partner no podrá utilizar la marca, el logotipo ni los signos distintivos de Zyteron en piezas publicitarias, perfiles o material propio sin autorización previa y escrita de la Empresa.",
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
      "Cualquiera de las partes podrá poner término al convenio, sin expresión de causa y sin derecho a indemnización, dando aviso por escrito con a lo menos {{dias_aviso_termino}} días corridos de anticipación.",
      "Zyteron podrá ponerle término de inmediato en caso de incumplimiento grave, en especial la recepción de dineros de clientes, la emisión de cotizaciones no autorizadas, la infracción a la confidencialidad o la atribución de una representación que no ostenta.",
    ],
  },
  {
    title: "Comisiones posteriores al término",
    paragraphs: [
      "Terminado el convenio, el Partner conservará el derecho a las comisiones por referidos aceptados con anterioridad cuyos negocios se cierren y sean pagados dentro de los {{dias_cola_comisiones}} días corridos siguientes al término.",
    ],
  },
  {
    title: "Domicilio",
    paragraphs: [
      "Las partes fijan domicilio en la comuna y ciudad de {{ciudad}} para todos los efectos legales de este convenio.",
    ],
  },
  {
    title: "Jurisdicción",
    paragraphs: [
      "Toda controversia relativa a la aplicación, interpretación, cumplimiento o validez de este convenio será sometida a los Tribunales Ordinarios de Justicia con asiento en la ciudad de {{ciudad}}.",
    ],
  },
  {
    title: "Firma electrónica y comunicaciones",
    paragraphs: [
      "Las partes reconocen plena validez a la suscripción por firma electrónica, conforme a la Ley N° 19.799.",
      "Las comunicaciones se entenderán válidamente efectuadas por correo electrónico a las direcciones individualizadas en la comparecencia.",
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
    version: "1.0.0",
    type: "executive_services",
    documentTitle: "CONTRATO DE PRESTACIÓN DE SERVICIOS COMERCIALES INDEPENDIENTES",
    subtitle: "Cargo funcional: {{cargo_funcional}}",
    appearance: APPEARANCE_COMMON,
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
    version: "1.0.0",
    type: "partner_agreement",
    documentTitle: "CONVENIO DE COLABORACIÓN COMERCIAL INDEPENDIENTE",
    subtitle: "Cargo funcional: {{cargo_funcional}}",
    appearance: APPEARANCE_COMMON,
    clauses: PARTNER_CLAUSES,
    closing: [
      "Leído por ambas partes y en señal de plena aceptación de todas y cada una de las cláusulas precedentes, firman:",
    ],
    bankAnnexTitle: "ANEXO A · DATOS BANCARIOS PARA EL PAGO DE COMISIONES",
    bankAnnexIntro:
      "Forma parte integrante del presente convenio el siguiente anexo, en el que se individualiza la cuenta bancaria destinada al pago de las comisiones:",
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
