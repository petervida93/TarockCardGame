import Card from './Card';

const Talon = ({ cards, isRevealed = false, onTalonClick }) => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="bg-green-800/40 rounded-xl p-6 shadow-2xl">
        <div className="text-center mb-3">
          <h3 className="text-white font-bold text-lg">Talon</h3>
          <p className="text-white/80 text-sm">{cards.length} kártya</p>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center max-w-xs">
          {isRevealed ? (
            // Ha fel van csukva, mutassuk az összes kártyát
            cards.map((card, index) => (
              <div
                key={`talon-${card.suit}-${card.value}-${index}`}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onTalonClick?.(card, index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onTalonClick?.(card, index)}
              >
                <Card
                  card={card}
                  faceDown={false}
                  selectable={false}
                />
              </div>
            ))
          ) : (
            // Ha nincs felcsukva, csak egy hátlapot mutassunk
            <div className="cursor-pointer">
              <Card
                card={{ suit: 'back', value: 0 }}
                faceDown={true}
                selectable={false}
              />
            </div>
          )}
        </div>
        
        {!isRevealed && (
          <div className="text-center mt-3">
            <p className="text-white/60 text-xs">Licitálás folyamatban...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Talon;
