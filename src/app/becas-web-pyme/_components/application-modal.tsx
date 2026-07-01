"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ApplicationForm } from "./application-form";

interface ApplicationModalProps {
  campaignId: string;
  officialInstagram: string;
  termsVersion?: string;
  privacyVersion?: string;
  variant?: "default" | "large";
}

export function ApplicationModal({
  campaignId,
  officialInstagram,
  termsVersion = "v1.0",
  privacyVersion = "v1.0",
  variant = "default",
}: ApplicationModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={
            variant === "large"
              ? "rounded-xl bg-blue-600 px-10 py-5 text-lg font-bold text-white transition-colors hover:bg-blue-500"
              : "rounded-xl bg-blue-600 px-8 py-4 font-bold text-white transition-colors hover:bg-blue-500"
          }
        >
          Postular a la beca
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Postulación: Becas Web Pyme</DialogTitle>
          <DialogDescription>
            Completa este formulario para registrar tu postulación oficial.
          </DialogDescription>
        </DialogHeader>
        <ApplicationForm 
          campaignId={campaignId} 
          officialInstagram={officialInstagram} 
          termsVersion={termsVersion}
          privacyVersion={privacyVersion}
          onSuccess={() => {
            // Optional: Handle close or success logic
          }} 
        />
      </DialogContent>
    </Dialog>
  );
}
