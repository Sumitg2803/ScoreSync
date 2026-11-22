from typing import List, Dict, Any
from .models import GameModel, PlayerModel

def calculate_leaderboard(game: GameModel) -> List[Dict[str, Any]]:
    """
    Computes real-time rankings and tie-breaking for a game.
    Supports both highest_wins and lowest_wins.
    """
    totals: Dict[str, Dict[str, Any]] = {}
    for p in game.players:
        totals[p.id] = {"player": p, "total_score": 0.0, "round_scores": []}

    for r in game.rounds:
        for p_id, score in r.scores.items():
            if p_id in totals:
                totals[p_id]["total_score"] += score
                totals[p_id]["round_scores"].append(score)

    is_highest = game.scoring_rule == "highest_wins"
    
    standings = list(totals.values())
    if is_highest:
        standings.sort(key=lambda x: x["total_score"], reverse=True)
    else:
        standings.sort(key=lambda x: x["total_score"], reverse=False)

    # Compute dense/standard ranks with ties
    current_rank = 1
    ranked_list = []
    for i, item in enumerate(standings):
        if i > 0 and item["total_score"] == standings[i - 1]["total_score"]:
            rank = ranked_list[i - 1]["rank"]
        else:
            rank = current_rank
        current_rank += 1
        
        ranked_list.append({
            "player": {
                "id": item["player"].id,
                "name": item["player"].name,
                "connected": item["player"].connected,
                "joined_at": item["player"].joined_at,
                "joined_at_round": getattr(item["player"], "joined_at_round", 1),
            },
            "total_score": round(item["total_score"], 2),
            "rank": rank,
            "round_scores": item["round_scores"],
        })

    return ranked_list
