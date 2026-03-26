import { FullGameState } from './types';
import { OBJECTIVES, SURVIVORS } from './content';

const MAX_SURVIVOR_WOUNDS = 3;

export function evaluateObjectives(s: FullGameState): FullGameState {
  const totalDeadSurvivors = Object.values(s.survivors).filter(sv => sv.wounds >= MAX_SURVIVOR_WOUNDS).length;
  const colonyWon = s.morale > 0;

  for (const player of s.players) {
    const objId = player.isExiled && player.exiledObjectiveId
      ? player.exiledObjectiveId
      : player.secretObjectiveId;

    const objective = OBJECTIVES.find(o => o.id === objId);
    if (!objective) {
      s.losers.push(player.playerId);
      continue;
    }

    const won = checkObjectiveCondition(s, player.playerId, objective.conditionKey, colonyWon, totalDeadSurvivors);
    if (won) s.winners.push(player.playerId);
    else s.losers.push(player.playerId);
  }

  return s;
}

function checkObjectiveCondition(
  s: FullGameState,
  playerId: string,
  conditionKey: string,
  colonyWon: boolean,
  totalDeadSurvivors: number,
): boolean {
  const player = s.players.find(p => p.playerId === playerId)!;
  const mySurvivors = Object.values(s.survivors).filter(sv => sv.ownerId === playerId);
  const myAliveSurvivors = mySurvivors.filter(sv => sv.wounds < MAX_SURVIVOR_WOUNDS);

  switch (conditionKey) {
    case 'survivalist':
      return myAliveSurvivors.filter(sv => sv.location === 'colony').length >= 3;

    case 'provider':
      return s.food >= 3;

    case 'medic':
      return myAliveSurvivors.length > 0 && myAliveSurvivors.every(sv => sv.wounds === 0);

    case 'armed':
      return myAliveSurvivors.some(sv => sv.equippedItemId !== null);

    case 'influencer': {
      const allAlive = Object.values(s.survivors).filter(sv => sv.wounds < MAX_SURVIVOR_WOUNDS);
      if (allAlive.length === 0) return false;
      const maxInfluence = Math.max(
        ...allAlive.map(sv => SURVIVORS.find(sc => sc.id === sv.cardId)?.influence ?? 0)
      );
      return myAliveSurvivors.some(
        sv => (SURVIVORS.find(sc => sc.id === sv.cardId)?.influence ?? 0) === maxInfluence
      );
    }

    case 'fighter':
      return mySurvivors.reduce((sum, sv) => sum + sv.killCount, 0) >= 5;

    case 'helper':
      return player.preventedCrisisCount >= 2;

    case 'hoarder':
      return player.hand.length >= 3;

    case 'guardian':
      return Object.values(s.locations).every(loc => loc.zombies <= 2);

    case 'quiet':
      return mySurvivors.every(sv => sv.frostbiteWounds === 0);

    // Betrayer objectives (colony must have failed)
    case 'saboteur':
      return !colonyWon;

    case 'infester':
      return Object.values(s.locations).some(loc => loc.zombies >= 5);

    case 'killer':
      return totalDeadSurvivors >= 4;

    // Exiled objectives
    case 'exile_revenge':
      return !colonyWon;

    case 'lone_wolf':
      return myAliveSurvivors.length >= 1;

    case 'scavenger': {
      const myCount = player.hand.length;
      return s.players.filter(p => p.playerId !== playerId).every(p => p.hand.length < myCount);
    }

    default:
      return false;
  }
}
