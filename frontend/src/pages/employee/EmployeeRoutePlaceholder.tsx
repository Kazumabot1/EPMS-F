interface EmployeeRoutePlaceholderProps {
  title: string;
  description: string;
}

const EmployeeRoutePlaceholder = ({ title, description }: EmployeeRoutePlaceholderProps) => {
  return (
    <section className="employee-placeholder">
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
};

export default EmployeeRoutePlaceholder;
