import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export function ViewportToggle({ viewport, onChange }) {
  return (
    <TooltipProvider>
      <ToggleGroup 
        type="single" 
        value={viewport} 
        onValueChange={(value) => value && onChange(value)}
        className="bg-[#0A0A0A] rounded-md border border-[#22222A] p-1"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value="desktop" 
              data-testid="viewport-desktop-btn"
              className="data-[state=on]:bg-[#19AFFF]/10 data-[state=on]:text-[#19AFFF] text-[#6A6A75] hover:text-[#EDEDED] px-2 py-1"
            >
              <Monitor className="w-4 h-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-[#1A1A20] border-[#22222A] text-[#EDEDED]">
            Desktop View
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value="tablet" 
              data-testid="viewport-tablet-btn"
              className="data-[state=on]:bg-[#19AFFF]/10 data-[state=on]:text-[#19AFFF] text-[#6A6A75] hover:text-[#EDEDED] px-2 py-1"
            >
              <Tablet className="w-4 h-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-[#1A1A20] border-[#22222A] text-[#EDEDED]">
            Tablet View (768px)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value="mobile" 
              data-testid="viewport-mobile-btn"
              className="data-[state=on]:bg-[#19AFFF]/10 data-[state=on]:text-[#19AFFF] text-[#6A6A75] hover:text-[#EDEDED] px-2 py-1"
            >
              <Smartphone className="w-4 h-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-[#1A1A20] border-[#22222A] text-[#EDEDED]">
            Mobile View (375px)
          </TooltipContent>
        </Tooltip>
      </ToggleGroup>
    </TooltipProvider>
  );
}

export default ViewportToggle;
