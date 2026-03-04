import { useState } from 'react';

const Card = ({ card, onClick, selectable = false, selected = false, faceDown = false, size = 'normal' }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getCardImage = () => {
    if (faceDown) {
      return '/assets/cards/back.png'; // Hátlap, ha van ilyen
    }

    const { suit, value } = card;
    
    if (suit === 'tarock') {
      return `/assets/cards/tarocks/t${String(value).padStart(2, '0')}.PNG`;
    }
    
    // Színes lapok: clubs, diamonds, hearts, spades
    const suitMap = {
      'clubs': 'clubs',
      'diamonds': 'diamonds',
      'hearts': 'hearts',
      'spades': 'spades'
    };
    
    return `/assets/cards/${suitMap[suit]}/${value}.PNG`;
  };

  const handleClick = () => {
    if (selectable && onClick) {
      onClick(card);
    }
  };
  
  // Size variations
  const sizeClasses = {
    normal: 'w-32 h-52',
    small: 'w-16 h-28',
    tiny: 'w-12 h-20'
  };

  return (
    <div
      className={`
        relative cursor-pointer transition-all duration-200
        ${selectable ? 'hover:-translate-y-4' : ''}
        ${selected ? '-translate-y-6 ring-4 ring-yellow-400' : ''}
        ${isHovered && selectable ? 'z-10' : ''}
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={selectable ? 0 : -1}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <img
        src={getCardImage()}
        alt={faceDown ? 'Card back' : `${card.suit} ${card.value}`}
        className={`${sizeClasses[size]} object-cover rounded-lg shadow-lg`}
        draggable={false}
      />
      {card.isHonor && !faceDown && size !== 'tiny' && (
        <div className={`absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold shadow-md ${
          size === 'small' ? 'w-5 h-5 text-xs' : 'w-8 h-8 text-sm'
        }`}>
          H
        </div>
      )}
    </div>
  );
};

export default Card;
