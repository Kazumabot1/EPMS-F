import Header from '../layout/Header';

interface HRHeaderProps {
  collapsed: boolean;
}

const HRHeader = ({ collapsed }: HRHeaderProps) => {
  return <Header collapsed={collapsed} />;
};

export default HRHeader;
