/**
 * Scheduler Service
 *
 * Планировщик задач для периодического выполнения операций.
 * Использует node-cron для cron-подобного расписания.
 */

const codeforcesSync = require('./codeforcesSync.service');

class SchedulerService {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Запустить все запланированные задачи
   */
  start() {
    if (this.isRunning) return;

    console.log('📅 Starting scheduler service...');

    // Синхронизация Codeforces раз в день в 3:00
    this.scheduleDaily(3, 0, async () => {
      console.log('🔄 Starting daily Codeforces sync...');
      try {
        const result = await codeforcesSync.syncToDatabase({
          limit: 200,
          minRating: 800,
          maxRating: 2000
        });
        console.log('✅ Daily sync completed:', result);
      } catch (error) {
        console.error('❌ Daily sync failed:', error.message);
      }
    });

    this.isRunning = true;
    console.log('✅ Scheduler service started');
  }

  /**
   * Запланировать задачу на определённое время каждый день
   */
  scheduleDaily(hour, minute, callback) {
    const job = {
      hour,
      minute,
      callback,
      interval: null
    };

    // Вычисляем время до следующего запуска
    const scheduleNext = () => {
      const now = new Date();
      const next = new Date();
      next.setHours(hour, minute, 0, 0);

      // Если время уже прошло сегодня, планируем на завтра
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      const delay = next.getTime() - now.getTime();
      console.log(`📅 Next Codeforces sync scheduled for ${next.toLocaleString()}`);

      job.interval = setTimeout(async () => {
        await callback();
        scheduleNext(); // Планируем следующий запуск
      }, delay);
    };

    scheduleNext();
    this.jobs.push(job);
  }

  /**
   * Остановить все задачи
   */
  stop() {
    this.jobs.forEach(job => {
      if (job.interval) {
        clearTimeout(job.interval);
      }
    });
    this.jobs = [];
    this.isRunning = false;
    console.log('🛑 Scheduler service stopped');
  }

  /**
   * Принудительно запустить синхронизацию Codeforces
   */
  async triggerCodeforcesSync(options = {}) {
    console.log('🔄 Manual Codeforces sync triggered...');
    return codeforcesSync.syncToDatabase(options);
  }
}

module.exports = new SchedulerService();
