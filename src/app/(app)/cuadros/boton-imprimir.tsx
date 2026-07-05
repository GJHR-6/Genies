"use client";

import { Button } from "@/components/ui/button";

export function BotonImprimir() {
  return (
    <Button
      className="bg-[#1F4E79] hover:bg-[#1F4E79]/90 print:hidden"
      onClick={() => window.print()}
    >
      Imprimir
    </Button>
  );
}
