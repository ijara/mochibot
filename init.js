require('dotenv').config();
var KEYDISCORD = process.env.KEYDISCORD;
var KEYYOUTUBE = process.env.KEYYOUTUBE;
const Discord = require('discord.js');
const {
	prefix
} = require('./config.json');
const ytdl = require('ytdl-core');
const searchYoutube = require('youtube-api-v3-search');

const client = new Discord.Client();

const queue = new Map();

client.once('ready', () => {
	console.log('Ready!');
});

client.once('reconnecting', () => {
	console.log('Reconnecting!');
});

client.once('disconnect', () => {
	console.log('Disconnect!');
});

client.on('message', async message => {
	if (message.author.bot) return;
	if (!message.content.startsWith(prefix)) return;

	const serverQueue = queue.get(message.guild.id);

	if (message.content.startsWith(`${prefix}play`)) {
		execute(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}skip`)) {
		skip(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}next`)) {
		skip(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}stop`)) {
		stop(message, serverQueue);
		return;
	} else {
		message.channel.send('You need to enter a valid command!')
	}
});

async function execute(message, serverQueue) {
	const args = message.content.split(/ (.+)/)[1];

	const voiceChannel = message.member.voiceChannel;
	if (!voiceChannel) return message.channel.send('hiss ! You need to be in a voice channel to play music!');
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
		return message.channel.send('hiss ! I need the permissions to join and speak in your voice channel!');
	}
	try {
		const songInfo = await ytdl.getInfo(args);
		add_song(songInfo,serverQueue,message,voiceChannel);
	} catch (error) {
		const options = {
			q:args,
			part:'snippet',
			type:'video'
		}
		  
		  let result = await searchYoutube(KEYYOUTUBE,options);
		  console.log(result);
		  const  songInfo = await ytdl.getInfo( result.items[0].id.videoId );
		  add_song(songInfo,serverQueue,message,voiceChannel);
	}
}

async function add_song(songInfo,serverQueue,message,voiceChannel){
	const song = {
		title: songInfo.title,
		url: songInfo.video_url,
	};

	if (!serverQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true,
		};

		queue.set(message.guild.id, queueContruct);

		queueContruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueContruct.connection = connection;
			play(message.guild, queueContruct.songs[0]);
			 message.channel.send(`${song.title} has been added to the queue!, miau miau`);

		} catch (err) {
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		return message.channel.send(`${song.title} has been added to the queue!, nya!`);
	}


}

function skip(message, serverQueue) {
	if (!message.member.voiceChannel) return message.channel.send('ñao? You have to be in a voice channel to stop the music!');
	if (!serverQueue) return message.channel.send('ñao? There is no song that I could skip!');
	serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
	if (!message.member.voiceChannel) return message.channel.send('ñao? You have to be in a voice channel to stop the music!');
	serverQueue.songs = [];
	serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', () => {
			console.log('Music ended!, slurp slurp! 🐈');
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => {
			console.error(error);
		});
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

client.login(KEYDISCORD);