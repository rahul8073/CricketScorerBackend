const express=require('express');
require('dotenv').config()
const user=require('./Models/User')
const Match=require('./Models/Match')
const { default: mongoose } = require('mongoose');
const User = require('./Models/User');
const app=express();
app.use(require('cors')());
const http = require('http');
const server = http.createServer(app);

const io = require("socket.io")(server, {
    cors: {
        origin: '*', // Replace '*' with your React Native app URL if in production
        methods: ['GET', 'POST'],
      },
      transports: ['websocket'], // Force WebSocket
})
app.get("/",(req,res)=>{
res.send("Server worked properly")
})
let currentBall=0
io.on('connection',(socket)=>{
    console.log("A user connected",socket.id);

socket.on("JoinRoom",(data)=>{
let Entryuser=new User({userId:data.userId}) 
Entryuser.save();
let MatchEntry=new Match(data)
MatchEntry.save();

socket.emit('updatedRoom',{message:"Join Room Successfully",userId:MatchEntry._id,MatchData:MatchEntry})
})


socket.on('updateScoreBoard', async (data) => {
    try {
        const {
            userId,
            strikerName,
            bowlerName,
            run,
            wicket,
            wide,
            noball,
            byes,
            legbyes
        } = data;

        const extraRun = wide || noball ? 1 : 0;
        const totalExtras = extraRun + byes + legbyes;

        // Find the match document by userId
        const matchData = await Match.findOne({ _id: userId });

        if (!matchData) {
            return socket.emit('error', { message: 'Match not found' });
        }

        // Determine current inning
        const currentInningIndex = matchData.currentInning - 1;
        const currentInning = matchData.innings[currentInningIndex];

        if (!currentInning) {
            return socket.emit('error', { message: 'Current inning not found' });
        }

        // Update batting team's stats
        currentInning.score += run + totalExtras;
        currentInning.wickets += wicket;

        // Check if wide or no ball, and increment ball count if neither
       // Check if wide or no ball
if (noball) {
    // Add extra run for the no-ball
    currentInning.score += 1;

    // If the batsman scores a run on the no-ball
    if (run === 1) {
        const batsmanIndex = currentInning.batsmen.findIndex(p => p.player === strikerName);
        if (batsmanIndex !== -1) {
            const batsman = currentInning.batsmen[batsmanIndex];
            batsman.runs += 1; // Update batsman's score
            batsman.balls += 0; // No-ball does not count as a legitimate ball
            batsman.strikeRate = ((batsman.runs / batsman.balls) * 100).toFixed(2);
        }

        // Emit strike change event for the single run
        socket.emit("strike", { changeStrike: true });
    }
} else if (wide) {
    // Wide ball logic (no strike change, no legitimate ball bowled)
    currentInning.score += 1; // Add extra run for the wide
} else {
    // Legitimate ball logic
    matchData.currentBall += 1; // Increment the ball count

    if (run === 1) {
        // Single run changes strike
        socket.emit("strike", { changeStrike: true });
    }

    // Check if the over is completed
    if (matchData.currentBall >= 6) {
        socket.emit("completedOvers", { overcompleted: true });
        matchData.currentBall = 0; // Reset balls after over completion
        currentInning.overs = (Math.floor(currentInning.overs) + 1).toFixed(1);

        // Strike changes at the end of the over
        socket.emit("strike", { changeStrike: true });
    } else {
        // If the over is not complete, add the decimal value for each ball bowled
        currentInning.overs = (Math.floor(currentInning.overs) + matchData.currentBall / 10).toFixed(1);
    }
}

        // Update total extras for the inning
        currentInning.totalExtras += totalExtras;

        // Update batsman stats
        if (strikerName) {
            const batsmanIndex = currentInning.batsmen.findIndex(p => p.player === strikerName);

            if (batsmanIndex !== -1) {
                const batsman = currentInning.batsmen[batsmanIndex];
                batsman.runs += run;
                if (!(wide || noball)) {
                    batsman.balls += 1;
                }
                batsman.fours += run === 4 ? 1 : 0;
                batsman.sixes += run === 6 ? 1 : 0;
                batsman.strikeRate = ((batsman.runs / batsman.balls) * 100).toFixed(2);
            } else {
                currentInning.batsmen.push({
                    player: strikerName,
                    runs: run,
                    balls: wide || noball ? 0 : 1,
                    fours: run === 4 ? 1 : 0,
                    sixes: run === 6 ? 1 : 0,
                    strikeRate: ((run / (wide || noball ? 1 : 1)) * 100).toFixed(2)
                });
            }
        }

        // Update bowler stats
        if (bowlerName) {
            const bowlerIndex = currentInning.bowlers.findIndex(p => p.player === bowlerName);

            if (bowlerIndex !== -1) {
                const bowler = currentInning.bowlers[bowlerIndex];
                bowler.overs += !(wide || noball) ? 1 / 6 : 0;
                bowler.runs += run + totalExtras;
                bowler.wickets += wicket;
                bowler.economy = (bowler.runs / (bowler.overs || 1)).toFixed(2);
            } else {
                currentInning.bowlers.push({
                    player: bowlerName,
                    overs: !(wide || noball) ? 1 / 6 : 0,
                    runs: run + totalExtras,
                    wickets: wicket,
                    economy: (run + totalExtras).toFixed(2)
                });
            }
        }

      // Check if the inning is complete
if (currentInning.overs >= matchData.overs || currentInning.wickets >= 10) {
    if (matchData.currentInning === 1) {
        socket.emit("InningComplete", { FirstInningCompleted: true });
        matchData.currentInning += 1; // Move to the next inning
    } else {
        // Both innings are complete, determine match result
        const team1Score = matchData.innings[0].score;
        const team1Wickets = matchData.innings[0].wickets;
        const team2Score = matchData.innings[1].score;
        const team2Wickets = matchData.innings[1].wickets;

        if (team2Score > team1Score) {
            // Team 2 wins, calculate wickets remaining
            const wicketsRemaining = 10 - team2Wickets;
            socket.emit("MatchComplete", {
                matchCompleted: true,
                winner: matchData.innings[1].battingTeam,
                result: `${matchData.innings[1].battingTeam} won by ${wicketsRemaining} wicket(s)`,
            });
        } else if (team1Score > team2Score) {
            // Team 1 wins, calculate run difference
            const runDifference = team1Score - team2Score;
            socket.emit("MatchComplete", {
                matchCompleted: true,
                winner: matchData.innings[0].battingTeam,
                result: `${matchData.innings[0].battingTeam} won by ${runDifference} run(s)`,
            });
        } else {
            // Match is a draw
            socket.emit("MatchComplete", {
                matchCompleted: true,
                result: "The match is a draw",
            });
        }
    }
}

        // Save updated match data to the database
        await matchData.save();

        // Emit success response back to the client
        socket.emit('scoreboardUpdated', {
            success: true,
            matchId: matchData._id,
            innings: matchData.innings
        });
    } catch (error) {
        console.error('Error updating scoreboard:', error.message);
        // Emit error response back to the client
        socket.emit('error', { message: 'Failed to update scoreboard', error: error.message });
    }
});





 









socket.on('disconnect', () => {
        console.log('User disconnected',socket.id);
    });
    
})

mongoose.connect(process.env.mongodb_url)
.then(() => {
    console.log('Connected to MongoDB successfully');
})
.catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});



server.listen(5000,'0.0.0.0',()=>{
    console.log('server started http://localhost:5000');
    
})
