import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { createTask } from '../../services/paperclipApi';
import { exportAsZip } from '../../utils/exportZip';
import { GitHubButton } from './GitHubButton';
import { Button } from '../ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { CheckCircle, Download, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export function ActionBar() {
  const { state, taskCreated } = useStudio();
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const hasCode = state.preview.html || state.preview.css || state.preview.js;
  const hasResponse = state.messages.some(m => m.role === 'assistant' && m.content);

  const handleApprove = async () => {
    setIsCreating(true);
    try {
      const result = await createTask({
        title: state.briefing?.title || 'New App Task',
        description: state.briefing?.description || 'Generated from Cartola Lab Studio',
        acceptanceCriteria: state.briefing?.acceptanceCriteria || [],
        previewHtml: state.preview.html,
        previewCss: state.preview.css,
        previewJs: state.preview.js
      });

      taskCreated(result.issue_id, result.identifier);
      setModalOpen(false);
      toast.success(`Task ${result.identifier} created successfully!`);
    } catch (error) {
      toast.error('Failed to create task: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportAsZip(state.preview);
      toast.success('Code exported successfully!');
    } catch (error) {
      toast.error('Failed to export: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div 
        data-testid="action-bar"
        className="h-14 border-t border-[#22222A] bg-[#0A0A0A] flex items-center justify-between px-4"
      >
        {/* Left: Status */}
        <div className="text-sm text-[#6A6A75]">
          {state.taskCreated ? (
            <span className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-4 h-4" />
              Task {state.createdIdentifier} created
            </span>
          ) : hasCode ? (
            <span>Preview ready</span>
          ) : (
            <span>Waiting for code...</span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Button
            data-testid="export-zip-btn"
            variant="outline"
            onClick={handleExport}
            disabled={!hasCode || isExporting}
            className="border-[#22222A] bg-transparent text-[#A0A0AB] hover:text-[#EDEDED] hover:bg-[#1A1A20] disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export
          </Button>

          <GitHubButton />

          <Button
            data-testid="approve-task-btn"
            onClick={() => setModalOpen(true)}
            disabled={!hasResponse || state.taskCreated}
            className="bg-[#19AFFF] hover:bg-[#40BDFF] text-white font-medium disabled:opacity-50 btn-lift"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve & Create Task
          </Button>
        </div>
      </div>

      {/* Approval Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#111115] border-[#22222A] text-[#EDEDED] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create Task</DialogTitle>
            <DialogDescription className="text-[#A0A0AB]">
              Review the task details before creating it in Paperclip.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-[#6A6A75] uppercase tracking-wider block mb-1">Title</label>
              <div className="p-3 bg-[#0A0A0A] border border-[#22222A] rounded-md text-[#EDEDED]">
                {state.briefing?.title || 'New App Task'}
              </div>
            </div>

            <div>
              <label className="text-xs text-[#6A6A75] uppercase tracking-wider block mb-1">Description</label>
              <div className="p-3 bg-[#0A0A0A] border border-[#22222A] rounded-md text-[#A0A0AB] text-sm max-h-32 overflow-auto">
                {state.briefing?.description || 'Generated from Cartola Lab Studio conversation with BroStorm AI.'}
              </div>
            </div>

            {state.briefing?.acceptanceCriteria?.length > 0 && (
              <div>
                <label className="text-xs text-[#6A6A75] uppercase tracking-wider block mb-1">Acceptance Criteria</label>
                <div className="p-3 bg-[#0A0A0A] border border-[#22222A] rounded-md space-y-1">
                  {state.briefing.acceptanceCriteria.map((criteria, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-[#A0A0AB]">
                      <span className="text-[#19AFFF]">•</span>
                      <span>{criteria}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-[#6A6A75] uppercase tracking-wider block mb-1">Pipeline</label>
              <div className="p-3 bg-[#0A0A0A] border border-[#22222A] rounded-md space-y-2">
                {['BroDesign → UI/UX design, visual assets', 'BroBuilder → Full stack implementation', 'BroDeploy → Build, test, deploy'].map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-[#A0A0AB]">
                    <span className="w-5 h-5 rounded-full bg-[#19AFFF]/10 text-[#19AFFF] text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="border-[#22222A] text-[#A0A0AB] hover:text-[#EDEDED]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isCreating}
              className="bg-[#19AFFF] hover:bg-[#40BDFF] text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Create in Paperclip
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ActionBar;
