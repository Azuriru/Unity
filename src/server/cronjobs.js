const { CronJob } = require('cron');
const ping = require('./crons/ping');

const jobs = [ alwaysOnline, ping ];

module.exports = jobs.map(job => {
    try {
        const cron = Object.assign(
            // Has such a shitty footprint that I have to comment what each numbered param means
            new CronJob(
                // Cronjob syntax for scheduler
                job.cron || '0 0 0 0 0 0',
                // Function to call
                job.task,
                // On complete, we don't need it
                null,
                // Start scheduler immediately, we do need it, used for disables
                !job.disabled,
                // Timezone, we use UTC
                null,
                // Context for function call, we want module.exports as the this value
                job,
                // Run task immediately, we don't need it
                null,
                // UTC offset, I don't know why this separate from the timezone one
                0
            ),
            job
        );

        if (cron.init) {
            cron.init();
        }

        return cron;
    } catch(e) {
        console.log('Error launching cron', job);
    }
});
