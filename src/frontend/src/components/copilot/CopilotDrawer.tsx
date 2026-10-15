import React from 'react';
import { Drawer } from '../common/Drawer';
import { CopilotChat } from './CopilotChat';
import { useOperations } from '../../context/OperationsContext';

export const CopilotDrawer: React.FC = () => {
  const { isCopilotOpen, setIsCopilotOpen } = useOperations();

  return (
    <Drawer
      isOpen={isCopilotOpen}
      onClose={() => setIsCopilotOpen(false)}
      title="Varunaa Copilot"
      subtitle="Operational Decision Intelligence & Natural Language Telemetry"
      width="max-w-2xl"
    >
      <div className="h-[calc(100vh-140px)] -m-6">
        <CopilotChat embedded={false} />
      </div>
    </Drawer>
  );
};
