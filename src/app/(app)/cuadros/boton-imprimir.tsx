"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotonImprimir() {
  return (
    <Button size="lg" className="print:hidden" onClick={() => window.print()}>
      <Printer />
      Imprimir cuadros
    </Button>
  );
}
