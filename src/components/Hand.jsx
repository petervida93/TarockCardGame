import Card from './Card';

const Hand = ({ cards, onCardClick, selectedCards = [], position = 'bottom' }) => {
  const getHandClasses = () => {
    const baseClasses = 'absolute flex';
    
    switch (position) {
      case 'bottom':
        return `${baseClasses} bottom-24 left-1/2 -translate-x-1/2 gap-1`;
      case 'left':
        return `${baseClasses} left-24 top-1/2 -translate-y-1/2 flex-col gap-1`;
      case 'top':
        return `${baseClasses} top-24 left-1/2 -translate-x-1/2 gap-1`;
      case 'right':
        return `${baseClasses} right-24 top-1/2 -translate-y-1/2 flex-col gap-1`;
      default:
        return baseClasses;
    }
  };

  const isCardSelected = (card) => {
    return selectedCards.some(c => c.suit === card.suit && c.value === card.value);
  };

  return (
    <div className={getHandClasses()}>
      {cards.map((card, index) => (
        <div
          key={`${card.suit}-${card.value}-${index}`}
          style={{
            marginLeft: (position === 'bottom' || position === 'top') && index > 0 ? '-60px' : '0',
            marginTop: (position === 'left' || position === 'right') && index > 0 ? '-120px' : '0'
          }}
        >
          <Card
            card={card}
            onClick={onCardClick}
            selectable={position === 'bottom'}
            selected={isCardSelected(card)}
            faceDown={position !== 'bottom'}
          />
        </div>
      ))}
    </div>
  );
};

export default Hand;
