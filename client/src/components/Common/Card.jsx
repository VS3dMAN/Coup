export const Card = ({ type, revealed, onClick, selectable = false }) => {
    const getCardColor = (type) => {
        const colors = {
            Duke: '#2196F3',
            Assassin: '#f44336',
            Captain: '#4CAF50',
            Ambassador: '#9C27B0',
            Contessa: '#FF9800'
        };
        return colors[type] || '#666';
    };

    return (
        <div
            className={`card-component ${revealed ? 'revealed' : ''} ${selectable ? 'selectable' : ''}`}
            onClick={onClick}
            style={{ borderColor: revealed ? getCardColor(type) : '#333' }}
        >
            <div className="card-emoji">{revealed ? '💀' : '🎴'}</div>
            <div className="card-type" style={{ color: revealed ? getCardColor(type) : '#333' }}>
                {revealed ? type : 'Hidden'}
            </div>
        </div>
    );
};
