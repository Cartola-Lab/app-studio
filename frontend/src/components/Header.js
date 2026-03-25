import React from 'react';
import { useStudio } from '../context/StudioContext';
import { Button } from './ui/button';
import { Settings, Plus, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

const LOGO_URL = 'https://static.prod-images.emergentagent.com/jobs/a95524e6-8d57-4a33-859d-6152ef3b48ac/images/2070b10d51be382b528c9736b63433b9f2d0fde90572e8b86fdc5a1b96d57c17.png';

export function Header() {
  const { state, newSession, toggleSettings, closeSettings } = useStudio();

  return (
    <>
      <header 
        data-testid="header"
        className="h-14 fixed top-0 left-0 right-0 border-b border-[#22222A] bg-[#0A0A0A] flex items-center justify-between px-4 z-50"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img 
            src={LOGO_URL} 
            alt="Cartola Lab" 
            className="w-8 h-8 object-contain"
          />
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-[#EDEDED] tracking-tight">
              Cartola Lab Studio
            </span>
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-[#19AFFF]/10 rounded-md border border-[#19AFFF]/20">
              <Sparkles className="w-3 h-3 text-[#19AFFF]" />
              <span className="text-xs text-[#19AFFF] font-medium">BroStorm AI</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            data-testid="header-new-session-btn"
            variant="outline"
            size="sm"
            onClick={newSession}
            className="border-[#22222A] bg-transparent hover:bg-[#1A1A20] text-[#A0A0AB] hover:text-[#EDEDED]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </Button>
          <Button
            data-testid="header-settings-btn"
            variant="ghost"
            size="icon"
            onClick={toggleSettings}
            className="text-[#A0A0AB] hover:text-[#EDEDED] hover:bg-[#1A1A20]"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Settings Modal */}
      <Dialog open={state.settingsOpen} onOpenChange={(open) => !open && closeSettings()}>
        <DialogContent className="bg-[#111115] border-[#22222A] text-[#EDEDED]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-[#A0A0AB] block mb-2">API Endpoint</label>
              <div className="p-3 bg-[#0A0A0A] border border-[#22222A] rounded-md text-sm text-[#6A6A75]">
                {process.env.REACT_APP_BACKEND_URL}/api
              </div>
            </div>
            <div>
              <label className="text-sm text-[#A0A0AB] block mb-2">Theme</label>
              <div className="p-3 bg-[#0A0A0A] border border-[#22222A] rounded-md text-sm text-[#A0A0AB]">
                Dark Mode (Default)
              </div>
            </div>
            <div>
              <label className="text-sm text-[#A0A0AB] block mb-2">Session ID</label>
              <div className="p-3 bg-[#0A0A0A] border border-[#22222A] rounded-md text-sm font-mono text-[#6A6A75]">
                {state.sessionId}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Header;
