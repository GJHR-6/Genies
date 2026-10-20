"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotonImprimir({ texto = "Imprimir cuadros" }: { texto?: string }) {
  return (
    <Button size="lg" className="print:hidden" onClick={() => window.print()}>
      <Printer />
      {texto}
    </Button>
  );
}
