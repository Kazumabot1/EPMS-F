import Sidebar from '../layout/Sidebar';

interface HRSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const HRSidebar = ({ collapsed, onToggleCollapse }: HRSidebarProps) => {
  return <Sidebar collapsed={collapsed} onToggle={onToggleCollapse} variant="hr" />;
};

export default HRSidebar;