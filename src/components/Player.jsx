const Player = ({ player, position, isCurrentPlayer = false }) => {
  const getPositionClasses = () => {
    const baseClasses = 'absolute flex items-center gap-3';
    
    switch (position) {
      case 'bottom':
        return `${baseClasses} bottom-4 left-1/2 -translate-x-1/2`;
      case 'left':
        return `${baseClasses} left-4 top-1/2 -translate-y-1/2 flex-col`;
      case 'top':
        return `${baseClasses} top-4 left-1/2 -translate-x-1/2`;
      case 'right':
        return `${baseClasses} right-4 top-1/2 -translate-y-1/2 flex-col`;
      default:
        return baseClasses;
    }
  };

  const avatarColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500'];
  const avatarColor = avatarColors[player.id % 4];

  return (
    <div className={getPositionClasses()}>
      <div className={`relative ${position === 'bottom' || position === 'top' ? 'flex items-center gap-3' : 'flex flex-col items-center gap-2'}`}>
        {/* Avatar */}
        <div className={`
          relative
          ${isCurrentPlayer ? 'ring-4 ring-yellow-400 ring-offset-2 animate-pulse' : 'ring-2 ring-gray-300'}
        `}>
          {isCurrentPlayer && (
            <div className="absolute -inset-1 bg-yellow-400 rounded-full opacity-75 animate-ping" />
          )}
          <div className={`
            w-16 h-16 rounded-full 
            ${avatarColor}
            flex items-center justify-center
            text-white font-bold text-xl
            shadow-lg
          `}>
            {player.name.charAt(0).toUpperCase()}
          </div>
          
          {/* Honor indicator */}
          {player.hasHonor && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md">
              H
            </div>
          )}
        </div>

        {/* Player info */}
        <div className={`
          bg-white dark:bg-gray-800 rounded-lg shadow-md px-3 py-2
          ${position === 'left' || position === 'right' ? 'text-center' : ''}
          ${player.disconnected ? 'opacity-50' : ''}
        `}>
          <div className="font-semibold text-sm text-gray-900 dark:text-white">
            {player.name}
            {player.disconnected && (
              <span className="ml-1 text-red-500" title="Kilépett">⚠</span>
            )}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {player.disconnected ? 'Kilépett' : `${player.cardCount} kártya`}
          </div>
          {player.isBidding && !player.disconnected && (
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
              Licitál...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Player;
