
'use strict';

console.log('Caroline Michalow changes start');

const async = require('async');
const db = require('../../database');
const batch = require('../../batch');

module.exports = {
	name: 'Reformatting post diffs to be stored in lists and hash instead of single zset',
	timestamp: Date.UTC(2018, 2, 15),
	method: function (callback) {
		const { progress } = this;
		console.log('Caroline Michalow changes start');

		function processDiffs(pid, diffs, next) {
			if (!diffs || !diffs.length) {
				progress.incr();
				return next();
			}

			async.each(diffs, (diff, next) => {
				handleDiff(pid, diff, next);
			}, (err) => {
				if (err) {
					return next(err);
				}

				progress.incr();
				return next();
			});
		}

		function handleDiff(pid, diff, callback) {
			async.series([
				async.apply(db.delete.bind(db), `post:${pid}:diffs`),
				async.apply(db.listPrepend.bind(db), `post:${pid}:diffs`, diff.score),
				async.apply(db.setObject.bind(db), `diff:${pid}.${diff.score}`, {
					pid: pid,
					patch: diff.value,
				}),
			], callback);
		}

		function processPid(pid, next) {
			db.getSortedSetRangeWithScores(`post:${pid}:diffs`, 0, -1, (err, diffs) => {
				if (err) {
					return next(err);
				}

				processDiffs(pid, diffs, next);
			});
		}

		batch.processSortedSet('posts:pid', (pids, next) => {
			async.each(pids, processPid, (err) => {
				if (err) {
					// Probably type error, ok to incr and continue
					progress.incr();
				}

				return next();
			});
			console.log('Caroline Michalow changes end');
		}, {
			progress: progress,
		}, callback);
	},
};

