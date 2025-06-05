"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | undefined>();

  const confirm: ConfirmFunction = (opts) => {
    return new Promise<boolean>((resolve) => {
      setOptions({
        title: "Bestätigen",
        cancelText: "Abbrechen",
        confirmText: "OK",
        ...opts,
      });
      setResolver(() => resolve);
    });
  };

  const handleClose = (result: boolean) => {
    if (resolver) resolver(result);
    setResolver(undefined);
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!options} onOpenChange={(open) => !open && handleClose(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{options?.title}</DialogTitle>
          </DialogHeader>
          <p>{options?.message}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              {options?.cancelText}
            </Button>
            <Button variant="destructive" onClick={() => handleClose(true)}>
              {options?.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
