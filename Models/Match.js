const mongoose = require('mongoose');

// Match schema to store match details
const MatchSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
        },
        currentBall: {
            type: Number,
            default: 0,
        },
        currentInning: {
            type: Number, // 1 for First Inning, 2 for Second Inning
            default: 1,
        },
        teams: {
            hostTeam: {
                type: String,
                required: true,
            },
            visitorTeam: {
                type: String,
                required: true,
            },
        },
        toss: {
            wonBy: {
                type: String, // Team that won the toss
                required: true,
            },
            optedTo: {
                type: String, // Bat or Bowl
                enum: ['Bat', 'Bowl'],
                required: true,
            },
        },
        overs: {
            type: Number,
            get: (v) => (Math.round(v * 10) / 10).toFixed(1), // Round to 1 decimal place
            set: (v) => parseFloat(v).toFixed(1), // Set value rounded to 1 decimal place
            required: true,
        },
        openingPlayers: {
            striker: {
                type: String, // Striker player name
                required: true,
            },
            nonStriker: {
                type: String, // Non-striker player name
                required: true,
            },
            openingBowler: {
                type: String, // Opening bowler name
                required: true,
            },
        },
        innings: [
            {
                battingTeam: {
                    type: String, // Name of the batting team
                    required: true,
                },
                bowlingTeam: {
                    type: String, // Name of the bowling team
                    required: true,
                },
                score: {
                    type: Number,
                    default: 0,
                },
                wickets: {
                    type: Number,
                    default: 0,
                },
                overs: {
                    type: Number,
                    default: 0,
                },
                totalExtras: {
                    type: Number,
                    default: 0,
                },
                batsmen: [
                    {
                        player: {
                            type: String,
                            required: true,
                        },
                        runs: { type: Number, default: 0 },
                        balls: { type: Number, default: 0 },
                        fours: { type: Number, default: 0 },
                        sixes: { type: Number, default: 0 },
                        strikeRate: { type: Number, default: 0 },
                    },
                ],
                bowlers: [
                    {
                        player: {
                            type: String,
                            required: true,
                        },
                        overs: { type: Number, default: 0 },
                        maidenOvers: { type: Number, default: 0 },
                        runs: { type: Number, default: 0 },
                        wickets: { type: Number, default: 0 },
                        economy: { type: Number, default: 0 },
                    },
                ],
            },
        ],
    },
    {
        collection: 'MatchScorer',
        timestamps: true,
    }
);

module.exports = mongoose.model('Match', MatchSchema);
