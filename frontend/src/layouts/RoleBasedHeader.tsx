import EmployeeHeader from '../components/header/EmployeeHeader';
import HRHeader from '../components/header/HRHeader';
import type { UserRole } from '../config/roleNavigation';

interface UserLike {
  fullName?: string;
}

interface RoleBasedHeaderProps {
  role: UserRole;
  collapsed: boolean;
  user?: UserLike | null;
}

const RoleBasedHeader = ({ role, collapsed, user }: RoleBasedHeaderProps) => {
  if (role === 'HR') {
    return <HRHeader collapsed={collapsed} />;
  }

  return <EmployeeHeader role={role} user={user} collapsed={collapsed} />;
};

export default RoleBasedHeader;
