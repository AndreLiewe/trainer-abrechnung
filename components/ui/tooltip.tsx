'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className="z-50 rounded-md bg-black text-white px-2 py-1 text-xs shadow-md"
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export {
  TooltipProvider,
  TooltipRoot as Tooltip,
  TooltipTrigger,
  TooltipContent
};
