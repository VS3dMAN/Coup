export const Button = ({
    children,
    onClick,
    disabled = false,
    variant = 'default',
    className = ''
}) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`btn btn-${variant} ${className} ${disabled ? 'disabled' : ''}`}
        >
            {children}
        </button>
    );
};
