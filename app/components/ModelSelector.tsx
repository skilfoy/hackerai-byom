"use client";

import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { ByomSelectedModel, ChatMode, SelectedModel } from "@/types/chat";
import { useIsMobile } from "@/hooks/use-mobile";

import { ByomSection } from "./ModelSelector/ByomSection";
import { byomOptionLabel } from "./ModelSelector/constants";
import { toConnectionModel } from "@/lib/ai/byom";

interface ModelSelectorProps {
  value: SelectedModel;
  onChange: (model: SelectedModel) => void;
  mode: ChatMode;
}

const ModelOptionList = ({
  value,
  onByomSelect,
  onClose,
}: {
  value: SelectedModel;
  onByomSelect: (model: ByomSelectedModel) => void;
  onClose: () => void;
}) => (
  <div className="flex flex-col gap-px">
    <ByomSection
      value={toConnectionModel(value)}
      onSelect={onByomSelect}
      onClose={onClose}
    />
  </div>
);

export function ModelSelector({ value, onChange, mode }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const isMobile = Boolean(useIsMobile());

  const connectionValue = toConnectionModel(value);
  const triggerLabel = byomOptionLabel(connectionValue);

  const handleByomSelect = (model: ByomSelectedModel) => {
    onChange(model);
  };

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      onClick={isMobile ? () => setOpen(true) : undefined}
      aria-expanded={isMobile ? open : undefined}
      aria-haspopup={isMobile ? "dialog" : undefined}
      aria-label={triggerLabel}
      title={triggerLabel}
      className="h-7 max-w-20 px-2 gap-1 text-sm font-medium rounded-md bg-transparent hover:bg-muted/30 focus-visible:ring-1 min-w-0 shrink min-[360px]:max-w-32 md:max-w-none"
    >
      <span className="truncate min-[360px]:hidden">{triggerLabel}</span>
      <span className="hidden truncate min-[360px]:inline md:hidden">
        {triggerLabel}
      </span>
      <span className="hidden truncate md:inline">{triggerLabel}</span>
      <ChevronDown className="h-3 w-3 ml-0.5 shrink-0" />
    </Button>
  );

  const options = (
    <ModelOptionList
      value={connectionValue}
      onByomSelect={handleByomSelect}
      onClose={() => setOpen(false)}
    />
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl px-3 pb-8 pt-0 overscroll-contain"
          >
            <SheetHeader className="pb-1 pt-4">
              <SheetTitle className="text-base">
                {mode === "agent" ? "Agent connection" : "Ask connection"}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Choose a model connection
              </SheetDescription>
            </SheetHeader>
            {options}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        data-chat-input-agent-menu
        className="w-[320px] p-1.5 rounded-xl max-h-[70vh] overflow-y-auto"
        align="start"
      >
        {options}
      </PopoverContent>
    </Popover>
  );
}
