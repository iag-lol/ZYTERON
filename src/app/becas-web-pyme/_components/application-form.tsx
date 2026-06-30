"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { scholarshipApplicationSchema, ScholarshipApplication } from "@/lib/becas/validation";

interface Props {
  campaignId: string;
  officialInstagram: string;
  onSuccess: () => void;
}

export function ApplicationForm({ campaignId, officialInstagram, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, trigger, watch, setValue, formState: { errors } } = useForm<ScholarshipApplication>({
    resolver: zodResolver(scholarshipApplicationSchema),
    defaultValues: {
      campaignId,
      turnstileToken: "DUMMY_TOKEN", // TODO: Implement real Turnstile
      businessRutExists: false,
      followsOfficialInstagramDeclared: undefined,
      logoRightsConfirmed: undefined,
      termsAccepted: undefined,
      privacyAccepted: undefined,
      truthfulnessConfirmed: undefined,
      winnerCaseStudyAcknowledged: undefined,
      publicGalleryConsent: false,
      publicInstagramConsent: false,
      marketingConsent: false,
    }
  });

  const businessRutExists = watch("businessRutExists");
  const publicGalleryConsent = watch("publicGalleryConsent");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const nextStep = async (fieldsToValidate: any[]) => {
    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return false;
    
    // Simulate getting a signed URL and uploading
    try {
      const res = await fetch("/api/becas/upload-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          fileName: file.name,
          mimeType: file.type,
          turnstileToken: "DUMMY"
        })
      });

      if (!res.ok) throw new Error("Error al preparar subida");

      const { signedUrl, path } = await res.json();
      
      // Upload actual file to Supabase via signedUrl
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      });

      if (!uploadRes.ok) throw new Error("Error al subir archivo");

      setValue("logoStoragePath", path);
      setValue("logoFileName", file.name);
      setValue("logoMimeType", file.type);
      setValue("logoSizeBytes", file.size);
      
      return true;
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al subir el logo. Verifica el formato y tamaño.");
      return false;
    }
  };

  const onSubmit = async (data: ScholarshipApplication) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // If logo changed, upload it first
      if (logoFile) {
        const uploadSuccess = await handleFileUpload(logoFile);
        if (!uploadSuccess) {
          setIsSubmitting(false);
          return;
        }
      }

      // We need to fetch the updated values since setValue doesn't instantly update the `data` passed to onSubmit
      const finalData = { ...data, logoStoragePath: watch("logoStoragePath"), logoFileName: watch("logoFileName"), logoMimeType: watch("logoMimeType"), logoSizeBytes: watch("logoSizeBytes") };

      const res = await fetch("/api/becas/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      const resData = await res.json();

      if (!res.ok) {
        setErrorMsg(resData.error || "Ocurrió un error al enviar tu postulación.");
      } else {
        setSuccessCode(resData.applicationCode);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocurrió un error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successCode) {
    return (
      <div className="py-8 text-center">
        <h3 className="mb-4 text-2xl font-bold text-green-600">¡Postulación Registrada!</h3>
        <p className="mb-4 text-slate-700">Tu postulación fue enviada correctamente.</p>
        <div className="mx-auto mb-6 max-w-sm rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">Código de participación:</p>
          <p className="text-2xl font-extrabold tracking-widest text-blue-700">{successCode}</p>
        </div>
        <p className="text-sm text-slate-500">
          Guarda este código. Zyteron podrá contactarte mediante el correo o WhatsApp indicado si necesita validar información. Tener un código no garantiza selección. Todas las postulaciones válidas se revisarán según las bases publicadas.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
      {/* Progress Bar */}
      <div className="mb-8 flex justify-between gap-2">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
        ))}
      </div>

      {errorMsg && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Step 1: Datos Contacto */}
      <div className={step === 1 ? 'block' : 'hidden'}>
        <h3 className="mb-4 text-lg font-bold">Paso 1: Datos de Contacto</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre completo</label>
            <input {...register("fullName")} className="w-full rounded-md border p-2" />
            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cargo en el negocio</label>
            <input {...register("applicantRole")} className="w-full rounded-md border p-2" />
            {errors.applicantRole && <p className="text-xs text-red-500">{errors.applicantRole.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Correo Electrónico</label>
            <input type="email" {...register("email")} className="w-full rounded-md border p-2" />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">WhatsApp</label>
            <input {...register("whatsapp")} placeholder="+569..." className="w-full rounded-md border p-2" />
            {errors.whatsapp && <p className="text-xs text-red-500">{errors.whatsapp.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Región</label>
            <input {...register("region")} className="w-full rounded-md border p-2" />
            {errors.region && <p className="text-xs text-red-500">{errors.region.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Comuna</label>
            <input {...register("comuna")} className="w-full rounded-md border p-2" />
            {errors.comuna && <p className="text-xs text-red-500">{errors.comuna.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Instagram personal o negocio</label>
            <input {...register("instagramHandle")} placeholder="@tu_cuenta" className="w-full rounded-md border p-2" />
            {errors.instagramHandle && <p className="text-xs text-red-500">{errors.instagramHandle.message}</p>}
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2">
          <input type="checkbox" id="follows" {...register("followsOfficialInstagramDeclared")} className="mt-1" />
          <label htmlFor="follows" className="text-sm">
            Confirmo que sigo la cuenta oficial <strong>@{officialInstagram}</strong> en Instagram para participar.
          </label>
        </div>
        {errors.followsOfficialInstagramDeclared && <p className="text-xs text-red-500">{errors.followsOfficialInstagramDeclared.message}</p>}
      </div>

      {/* Step 2: Datos Negocio */}
      <div className={step === 2 ? 'block' : 'hidden'}>
        <h3 className="mb-4 text-lg font-bold">Paso 2: Datos del Negocio</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre del negocio</label>
            <input {...register("businessName")} className="w-full rounded-md border p-2" />
            {errors.businessName && <p className="text-xs text-red-500">{errors.businessName.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo de negocio</label>
            <select {...register("businessType")} className="w-full rounded-md border p-2">
              <option value="">Selecciona...</option>
              <option value="Emprendimiento inicial">Emprendimiento inicial</option>
              <option value="Persona natural con negocio">Persona natural con negocio</option>
              <option value="Empresa formalizada">Empresa formalizada</option>
              <option value="Pyme">Pyme</option>
            </select>
            {errors.businessType && <p className="text-xs text-red-500">{errors.businessType.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Rubro</label>
            <input {...register("industry")} className="w-full rounded-md border p-2" />
            {errors.industry && <p className="text-xs text-red-500">{errors.industry.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Descripción breve (máx 500 caract.)</label>
            <textarea {...register("businessDescription")} rows={3} className="w-full rounded-md border p-2" />
            {errors.businessDescription && <p className="text-xs text-red-500">{errors.businessDescription.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Objetivo principal de la web</label>
            <select {...register("websiteGoal")} className="w-full rounded-md border p-2">
              <option value="">Selecciona...</option>
              <option value="Conseguir más clientes">Conseguir más clientes</option>
              <option value="Vender productos">Vender productos</option>
              <option value="Mejorar presencia digital">Mejorar presencia digital</option>
            </select>
            {errors.websiteGoal && <p className="text-xs text-red-500">{errors.websiteGoal.message}</p>}
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-2">
          <input type="checkbox" id="rutExists" {...register("businessRutExists")} />
          <label htmlFor="rutExists" className="text-sm font-medium">¿Tienes RUT de empresa formalizada?</label>
        </div>
        
        {businessRutExists && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">RUT Empresa</label>
            <input {...register("businessRut")} className="w-full rounded-md border p-2" placeholder="12.345.678-9" />
            {errors.businessRut && <p className="text-xs text-red-500">{errors.businessRut.message}</p>}
          </div>
        )}
      </div>

      {/* Step 3: Historia y Necesidad */}
      <div className={step === 3 ? 'block' : 'hidden'}>
        <h3 className="mb-4 text-lg font-bold">Paso 3: Historia y Necesidad</h3>
        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">¿Por qué tu negocio necesita esta beca?</label>
            <textarea {...register("scholarshipReason")} rows={4} className="w-full rounded-md border p-2" />
            {errors.scholarshipReason && <p className="text-xs text-red-500">{errors.scholarshipReason.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">¿Qué productos o servicios ofreces?</label>
            <textarea {...register("productsServicesDescription")} rows={3} className="w-full rounded-md border p-2" />
            {errors.productsServicesDescription && <p className="text-xs text-red-500">{errors.productsServicesDescription.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">¿Qué esperas conseguir con la nueva web?</label>
            <textarea {...register("expectedResult")} rows={3} className="w-full rounded-md border p-2" />
            {errors.expectedResult && <p className="text-xs text-red-500">{errors.expectedResult.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">¿Tienes material (logo, textos, fotos) para el proyecto?</label>
            <select {...register("projectMaterialStatus")} className="w-full rounded-md border p-2">
              <option value="">Selecciona...</option>
              <option value="Completo">Sí, tengo logo, imágenes e información.</option>
              <option value="Parcial">Tengo parte del material.</option>
              <option value="Nada">Necesitaré orientación para prepararlo.</option>
            </select>
            {errors.projectMaterialStatus && <p className="text-xs text-red-500">{errors.projectMaterialStatus.message}</p>}
          </div>
        </div>
      </div>

      {/* Step 4: Logo */}
      <div className={step === 4 ? 'block' : 'hidden'}>
        <h3 className="mb-4 text-lg font-bold">Paso 4: Logo o Imagen</h3>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Sube el logo de tu negocio o una imagen representativa. Máximo 5MB (JPG, PNG, WEBP).</p>
          <input 
            type="file" 
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setLogoFile(e.target.files[0]);
                // Clear validation errors for logo since we will upload on submit
                setValue("logoStoragePath", "pending");
                setValue("logoFileName", e.target.files[0].name);
                setValue("logoMimeType", e.target.files[0].type);
                setValue("logoSizeBytes", e.target.files[0].size);
              }
            }}
            className="w-full rounded-md border p-2" 
          />
          {errors.logoStoragePath && <p className="text-xs text-red-500">{errors.logoStoragePath.message}</p>}
          
          <div className="flex items-start gap-2">
            <input type="checkbox" id="logoRights" {...register("logoRightsConfirmed")} className="mt-1" />
            <label htmlFor="logoRights" className="text-sm">
              Declaro que soy titular o cuento con autorización para utilizar y subir esta imagen o logo.
            </label>
          </div>
          {errors.logoRightsConfirmed && <p className="text-xs text-red-500">{errors.logoRightsConfirmed.message}</p>}
        </div>
      </div>

      {/* Step 5: Consentimientos */}
      <div className={step === 5 ? 'block' : 'hidden'}>
        <h3 className="mb-4 text-lg font-bold">Paso 5: Vitrina y Autorizaciones</h3>
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="font-semibold">Consentimientos Obligatorios</h4>
            <label className="flex items-start gap-3">
              <input type="checkbox" {...register("termsAccepted")} className="mt-1" />
              <span className="text-sm">He leído y acepto las Bases de Becas Web Pyme Zyteron.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" {...register("privacyAccepted")} className="mt-1" />
              <span className="text-sm">He leído y acepto la Política de Privacidad para el tratamiento de mis datos.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" {...register("truthfulnessConfirmed")} className="mt-1" />
              <span className="text-sm">Declaro que la información entregada es verdadera y actualizada.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" {...register("winnerCaseStudyAcknowledged")} className="mt-1" />
              <span className="text-sm">Entiendo que si soy seleccionado, deberé firmar un acuerdo de caso de éxito.</span>
            </label>
          </div>

          <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <h4 className="font-semibold text-blue-900">Vitrina Pública (Opcional)</h4>
            <label className="flex items-start gap-3">
              <input type="checkbox" {...register("publicGalleryConsent")} className="mt-1" />
              <span className="text-sm text-blue-800">Autorizo a publicar mi negocio en la Vitrina Pública de Postulantes.</span>
            </label>
            
            {publicGalleryConsent && (
              <div className="ml-6 space-y-3">
                <label className="block text-sm">
                  Presentación pública breve (máx 160 caracteres):
                  <textarea {...register("publicDescription")} className="mt-1 w-full rounded-md border p-2" rows={2} />
                  {errors.publicDescription && <p className="text-xs text-red-500">{errors.publicDescription.message}</p>}
                </label>
                <label className="flex items-start gap-2">
                  <input type="checkbox" {...register("publicInstagramConsent")} className="mt-1" />
                  <span className="text-sm">Mostrar mi Instagram públicamente.</span>
                </label>
              </div>
            )}
          </div>

          <label className="flex items-start gap-3">
            <input type="checkbox" {...register("marketingConsent")} className="mt-1" />
            <span className="text-sm">Autorizo a Zyteron a contactarme con información, diagnósticos o promociones.</span>
          </label>
        </div>
      </div>

      {/* Step 6: Resumen */}
      <div className={step === 6 ? 'block' : 'hidden'}>
        <h3 className="mb-4 text-lg font-bold">Paso 6: Confirmación Final</h3>
        <p className="mb-4 text-sm text-slate-600">
          Revisa que todos tus datos sean correctos antes de enviar la postulación.
        </p>
        <div className="rounded-md bg-slate-100 p-4 text-sm text-slate-800">
          <p><strong>Negocio:</strong> {watch("businessName")}</p>
          <p><strong>Representante:</strong> {watch("fullName")}</p>
          <p><strong>Correo:</strong> {watch("email")}</p>
          <p><strong>Vitrina:</strong> {watch("publicGalleryConsent") ? 'Autorizada' : 'No autorizada'}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between border-t pt-4">
        {step > 1 ? (
          <button type="button" onClick={prevStep} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Atrás
          </button>
        ) : <div />}
        
        {step < 6 ? (
          <button 
            type="button" 
            onClick={() => {
              if (step === 1) nextStep(["fullName", "applicantRole", "email", "whatsapp", "region", "comuna", "instagramHandle", "followsOfficialInstagramDeclared"]);
              if (step === 2) nextStep(["businessName", "businessType", "businessRutExists", "businessRut", "industry", "businessDescription", "websiteGoal"]);
              if (step === 3) nextStep(["scholarshipReason", "productsServicesDescription", "expectedResult", "projectMaterialStatus"]);
              if (step === 4) nextStep(["logoStoragePath", "logoRightsConfirmed"]);
              if (step === 5) nextStep(["termsAccepted", "privacyAccepted", "truthfulnessConfirmed", "winnerCaseStudyAcknowledged", "publicDescription"]);
            }} 
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            Siguiente
          </button>
        ) : (
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {isSubmitting ? "Enviando..." : "Enviar Postulación"}
          </button>
        )}
      </div>
    </form>
  );
}
