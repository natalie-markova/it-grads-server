/**
 * SkillAggregator Service
 *
 * Автоматически рассчитывает радар навыков на основе:
 * - Code Battle (решённые задачи, рейтинг, языки)
 * - Резюме (опыт, технологии, портфолио)
 * - AI Интервью (оценки, направления)
 * - Audio Интервью (soft skills, стрессоустойчивость)
 * - Roadmap (прогресс по картам специальностей)
 * - Quiz (будущее расширение)
 */

const db = require('../db/models');
const { Op } = require('sequelize');

// Веса для расчёта каждой категории радара
const WEIGHTS = {
  programming: { codebattle: 0.4, resume: 0.3, roadmap: 0.2, interview: 0.1 },
  databases: { quiz: 0.3, roadmap: 0.3, resume: 0.25, interview: 0.15 },
  cloud: { roadmap: 0.4, quiz: 0.3, resume: 0.3 },
  devops: { roadmap: 0.4, quiz: 0.3, resume: 0.3 },
  testing: { codebattle: 0.5, quiz: 0.3, resume: 0.2 },
  networking: { quiz: 0.4, roadmap: 0.3, resume: 0.3 },
  security: { quiz: 0.4, roadmap: 0.3, resume: 0.3 },
  ai_ml: { quiz: 0.3, roadmap: 0.3, interview: 0.2, resume: 0.2 },
  data_science: { quiz: 0.35, roadmap: 0.35, resume: 0.3 },
  management: { roadmap: 0.4, quiz: 0.3, resume: 0.3 },
  ui_ux: { roadmap: 0.4, quiz: 0.3, resume: 0.3 },
  mobile: { roadmap: 0.35, quiz: 0.25, codebattle: 0.2, resume: 0.2 },
  communication: { audioInterview: 0.6, aiInterview: 0.4 },
  algorithms: { codebattle: 1.0 }
};

// Маппинг технологий к категориям
const TECH_CATEGORIES = {
  programming: ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'react', 'vue', 'angular', 'node.js', 'django', 'spring', 'express', 'nextjs', 'nest.js'],
  databases: ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'elasticsearch', 'cassandra', 'dynamodb', 'firebase'],
  cloud: ['aws', 'azure', 'gcp', 'google cloud', 'heroku', 'digitalocean', 'cloudflare'],
  devops: ['docker', 'kubernetes', 'jenkins', 'gitlab ci', 'github actions', 'ansible', 'terraform', 'ci/cd', 'nginx', 'apache'],
  testing: ['jest', 'mocha', 'pytest', 'selenium', 'cypress', 'junit', 'testng', 'postman'],
  networking: ['tcp/ip', 'dns', 'http', 'rest', 'graphql', 'websocket', 'grpc', 'linux', 'bash'],
  security: ['oauth', 'jwt', 'ssl', 'encryption', 'owasp', 'penetration testing', 'firewall'],
  ai_ml: ['tensorflow', 'pytorch', 'keras', 'scikit-learn', 'opencv', 'nlp', 'machine learning', 'deep learning', 'neural networks'],
  data_science: ['pandas', 'numpy', 'matplotlib', 'tableau', 'power bi', 'spark', 'hadoop', 'data analysis', 'statistics'],
  management: ['agile', 'scrum', 'kanban', 'jira', 'trello', 'project management', 'product management'],
  ui_ux: ['figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'css', 'sass', 'tailwind', 'bootstrap', 'material ui'],
  mobile: ['react native', 'flutter', 'swift', 'kotlin', 'android', 'ios', 'expo']
};

// Маппинг категорий задач CodeBattle к категориям радара
const CODEBATTLE_CATEGORIES = {
  algorithms: 'algorithms',
  'data-structures': 'algorithms',
  arrays: 'programming',
  strings: 'programming',
  math: 'algorithms',
  sorting: 'algorithms',
  searching: 'algorithms',
  recursion: 'algorithms',
  'dynamic-programming': 'algorithms',
  graphs: 'algorithms',
  trees: 'algorithms',
  databases: 'databases',
  sql: 'databases'
};

// Маппинг направлений интервью к категориям радара
const INTERVIEW_DIRECTIONS = {
  frontend: ['programming', 'ui_ux'],
  backend: ['programming', 'databases', 'devops'],
  fullstack: ['programming', 'databases', 'ui_ux']
};

// Маппинг категорий roadmap к категориям радара
const ROADMAP_CATEGORIES = {
  role: {
    'frontend-developer': ['programming', 'ui_ux'],
    'backend-developer': ['programming', 'databases', 'devops'],
    'fullstack-developer': ['programming', 'databases', 'ui_ux', 'devops'],
    'devops-engineer': ['devops', 'cloud', 'networking'],
    'data-scientist': ['data_science', 'ai_ml', 'programming'],
    'ml-engineer': ['ai_ml', 'programming', 'data_science'],
    'mobile-developer': ['mobile', 'programming'],
    'qa-engineer': ['testing', 'programming'],
    'security-engineer': ['security', 'networking'],
    'project-manager': ['management']
  },
  language: {
    javascript: ['programming'],
    typescript: ['programming'],
    python: ['programming'],
    java: ['programming'],
    go: ['programming'],
    rust: ['programming']
  },
  framework: {
    react: ['programming', 'ui_ux'],
    vue: ['programming', 'ui_ux'],
    angular: ['programming', 'ui_ux'],
    django: ['programming', 'databases'],
    spring: ['programming', 'databases'],
    'react-native': ['mobile', 'programming'],
    flutter: ['mobile', 'programming']
  },
  skill: {
    docker: ['devops'],
    kubernetes: ['devops', 'cloud'],
    aws: ['cloud'],
    postgresql: ['databases'],
    mongodb: ['databases'],
    testing: ['testing'],
    security: ['security']
  }
};

class SkillAggregatorService {
  /**
   * Получить или создать запись SkillScore для пользователя
   */
  async getOrCreateSkillScore(userId) {
    let skillScore = await db.SkillScore.findOne({ where: { userId } });

    if (!skillScore) {
      skillScore = await db.SkillScore.create({ userId });
    }

    return skillScore;
  }

  /**
   * Получить радар (с пересчётом если устарел > 5 минут)
   */
  async getOrRecalculate(userId, forceRecalculate = false) {
    const skillScore = await this.getOrCreateSkillScore(userId);

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const needsRecalculation = forceRecalculate ||
      !skillScore.lastCalculatedAt ||
      skillScore.lastCalculatedAt < fiveMinutesAgo;

    if (needsRecalculation) {
      return await this.recalculateRadar(userId);
    }

    return skillScore;
  }

  /**
   * Полный пересчёт радара навыков
   */
  async recalculateRadar(userId) {
    const skillScore = await this.getOrCreateSkillScore(userId);

    // Собираем данные из всех источников параллельно
    const [
      codebattleData,
      resumeData,
      aiInterviewData,
      audioInterviewData,
      roadmapData
    ] = await Promise.all([
      this.collectCodeBattleData(userId),
      this.collectResumeData(userId),
      this.collectAIInterviewData(userId),
      this.collectAudioInterviewData(userId),
      this.collectRoadmapData(userId)
    ]);

    // Обновляем метрики источников
    skillScore.codebattle = codebattleData;
    skillScore.resume = resumeData;
    skillScore.aiInterview = aiInterviewData;
    skillScore.audioInterview = audioInterviewData;
    skillScore.roadmap = roadmapData;

    // Рассчитываем итоговый радар
    const { radar, breakdown } = this.calculateRadar(
      codebattleData,
      resumeData,
      aiInterviewData,
      audioInterviewData,
      roadmapData,
      skillScore.quiz
    );

    skillScore.calculatedRadar = radar;
    skillScore.radarBreakdown = breakdown;

    // Генерируем рекомендации
    skillScore.recommendations = this.generateRecommendations(radar, breakdown, {
      codebattle: codebattleData,
      resume: resumeData,
      aiInterview: aiInterviewData,
      audioInterview: audioInterviewData,
      roadmap: roadmapData
    });

    // Проверяем достижения
    skillScore.achievements = this.checkAchievements(skillScore);

    skillScore.lastCalculatedAt = new Date();
    await skillScore.save();

    return skillScore;
  }

  /**
   * Собираем данные из CodeBattle
   */
  async collectCodeBattleData(userId) {
    const [playerRating, sessions, matches] = await Promise.all([
      db.PlayerRating.findOne({ where: { userId } }),
      db.GameSession.findAll({
        where: { userId, status: 'completed' },
        include: [{ model: db.GameTask, as: 'task' }]
      }),
      db.GameMatch.findAll({
        where: {
          [Op.or]: [{ player1Id: userId }, { player2Id: userId }],
          status: 'completed'
        }
      })
    ]);

    const solvedSessions = sessions.filter(s => s.solved);
    const categories = {};
    const languages = {};
    let totalSolveTime = 0;
    let firstAttemptCount = 0;
    let beatAiCount = 0;
    let totalAiGames = 0;

    // Группируем по категориям и языкам
    for (const session of solvedSessions) {
      if (session.task?.category) {
        categories[session.task.category] = (categories[session.task.category] || 0) + 1;
      }
      if (session.language) {
        languages[session.language] = (languages[session.language] || 0) + 1;
      }
      if (session.timeSpent) {
        totalSolveTime += session.timeSpent;
      }
      if (session.hintsUsed === 0) {
        firstAttemptCount++;
      }
      if (session.mode === 'vs_ai') {
        totalAiGames++;
        if (session.beatAi) {
          beatAiCount++;
        }
      }
    }

    // Подсчёт по сложности
    const easySolved = solvedSessions.filter(s => s.task?.difficulty === 'easy').length;
    const mediumSolved = solvedSessions.filter(s => s.task?.difficulty === 'medium').length;
    const hardSolved = solvedSessions.filter(s => s.task?.difficulty === 'hard').length;

    // PvP статистика
    let pvpWins = 0;
    let pvpGames = 0;
    for (const match of matches) {
      pvpGames++;
      if (match.winnerId === userId) {
        pvpWins++;
      }
    }

    return {
      totalSolved: solvedSessions.length,
      easySolved,
      mediumSolved,
      hardSolved,
      avgSolveTime: solvedSessions.length > 0 ? Math.round(totalSolveTime / solvedSessions.length) : 0,
      firstAttemptSuccess: solvedSessions.length > 0 ? Math.round((firstAttemptCount / solvedSessions.length) * 100) : 0,
      languages,
      categories,
      pvpWinRate: pvpGames > 0 ? Math.round((pvpWins / pvpGames) * 100) : 0,
      pvpGames,
      rating: playerRating?.rating || 1000,
      maxRating: playerRating?.maxRating || 1000,
      league: playerRating?.league || 'bronze',
      streak: playerRating?.streak || 0,
      dailyChallengeStreak: playerRating?.dailyChallengeStreak || 0,
      beatAiCount,
      totalAiGames
    };
  }

  /**
   * Собираем данные из резюме
   */
  async collectResumeData(userId) {
    const resume = await db.Resume.findOne({ where: { userId } });

    if (!resume) {
      return {
        hasPortfolio: false,
        portfolioUrl: null,
        experienceYears: 0,
        technologies: [],
        level: 'junior',
        completeness: 0,
        hasDescription: false,
        hasEducation: false,
        location: null
      };
    }

    // Извлекаем технологии из skills
    const technologies = [];
    if (resume.skills && Array.isArray(resume.skills)) {
      for (const skill of resume.skills) {
        if (skill.skill && skill.level > 0) {
          technologies.push(skill.skill.toLowerCase());
        }
      }
    }
    if (resume.skillsArray && Array.isArray(resume.skillsArray)) {
      for (const skill of resume.skillsArray) {
        const lowerSkill = skill.toLowerCase();
        if (!technologies.includes(lowerSkill)) {
          technologies.push(lowerSkill);
        }
      }
    }

    // Оценка заполненности
    let completeness = 0;
    if (resume.title) completeness += 15;
    if (resume.description && resume.description.length > 50) completeness += 20;
    if (resume.experience && resume.experience.length > 30) completeness += 20;
    if (resume.education && resume.education.length > 20) completeness += 15;
    if (resume.portfolio) completeness += 15;
    if (technologies.length > 0) completeness += 15;

    // Оценка опыта (парсим из текста если есть)
    let experienceYears = 0;
    if (resume.level === 'middle') experienceYears = 2;
    if (resume.level === 'senior') experienceYears = 4;
    if (resume.level === 'lead') experienceYears = 6;

    return {
      hasPortfolio: !!resume.portfolio,
      portfolioUrl: resume.portfolio,
      experienceYears,
      technologies,
      level: resume.level || 'junior',
      completeness: Math.min(100, completeness),
      hasDescription: !!(resume.description && resume.description.length > 50),
      hasEducation: !!(resume.education && resume.education.length > 20),
      location: resume.location
    };
  }

  /**
   * Собираем данные из AI интервью
   */
  async collectAIInterviewData(userId) {
    const sessions = await db.AIInterviewSession.findAll({
      where: {
        userId,
        interviewerPersona: null // Только текстовые интервью
      }
    });

    const completedSessions = sessions.filter(s => s.status === 'completed');

    if (completedSessions.length === 0) {
      return {
        sessionsCompleted: 0,
        totalSessions: sessions.length,
        avgScore: 0,
        maxScore: 0,
        strongAreas: [],
        weakAreas: [],
        directions: {},
        technologies: {},
        levels: {}
      };
    }

    const directions = {};
    const technologies = {};
    const levels = {};
    let totalScore = 0;
    let maxScore = 0;
    const allStrengths = [];
    const allWeaknesses = [];

    for (const session of completedSessions) {
      if (session.totalScore) {
        totalScore += session.totalScore;
        maxScore = Math.max(maxScore, session.totalScore);
      }

      // Агрегируем по направлениям
      if (session.direction) {
        if (!directions[session.direction]) {
          directions[session.direction] = { count: 0, totalScore: 0 };
        }
        directions[session.direction].count++;
        directions[session.direction].totalScore += session.totalScore || 0;
      }

      // Агрегируем по технологиям
      if (session.technologies && Array.isArray(session.technologies)) {
        for (const tech of session.technologies) {
          if (!technologies[tech]) {
            technologies[tech] = { count: 0, avgScore: 0 };
          }
          technologies[tech].count++;
        }
      }

      // Агрегируем по уровням
      if (session.level) {
        if (!levels[session.level]) {
          levels[session.level] = { count: 0, avgScore: 0 };
        }
        levels[session.level].count++;
        levels[session.level].avgScore =
          (levels[session.level].avgScore * (levels[session.level].count - 1) + (session.totalScore || 0)) /
          levels[session.level].count;
      }

      // Собираем сильные/слабые стороны
      if (session.strengths) {
        allStrengths.push(...(Array.isArray(session.strengths) ? session.strengths : []));
      }
      if (session.weaknesses) {
        allWeaknesses.push(...(Array.isArray(session.weaknesses) ? session.weaknesses : []));
      }
    }

    // Вычисляем средний балл по направлениям
    for (const dir of Object.keys(directions)) {
      directions[dir].avgScore = directions[dir].count > 0
        ? Math.round(directions[dir].totalScore / directions[dir].count)
        : 0;
    }

    return {
      sessionsCompleted: completedSessions.length,
      totalSessions: sessions.length,
      avgScore: completedSessions.length > 0 ? Math.round(totalScore / completedSessions.length) : 0,
      maxScore,
      strongAreas: [...new Set(allStrengths)].slice(0, 5),
      weakAreas: [...new Set(allWeaknesses)].slice(0, 5),
      directions,
      technologies,
      levels
    };
  }

  /**
   * Собираем данные из аудио интервью
   */
  async collectAudioInterviewData(userId) {
    const sessions = await db.AIInterviewSession.findAll({
      where: {
        userId,
        interviewerPersona: { [Op.ne]: null } // Только аудио интервью
      }
    });

    const completedSessions = sessions.filter(s => s.status === 'completed');

    if (completedSessions.length === 0) {
      return {
        sessionsCompleted: 0,
        totalSessions: sessions.length,
        avgScore: 0,
        maxScore: 0,
        personaScores: {
          strict_hr: { count: 0, avgScore: 0 },
          friendly_tech: { count: 0, avgScore: 0 },
          direct_ceo: { count: 0, avgScore: 0 }
        },
        communicationScore: 0,
        stressResistanceScore: 0,
        avgDuration: 0
      };
    }

    const personaScores = {
      strict_hr: { count: 0, totalScore: 0, avgScore: 0 },
      friendly_tech: { count: 0, totalScore: 0, avgScore: 0 },
      direct_ceo: { count: 0, totalScore: 0, avgScore: 0 }
    };

    let totalScore = 0;
    let maxScore = 0;
    let totalDuration = 0;

    for (const session of completedSessions) {
      const score = session.overallScore || 0;
      totalScore += score;
      maxScore = Math.max(maxScore, score);
      totalDuration += session.duration || 0;

      if (session.interviewerPersona && personaScores[session.interviewerPersona]) {
        personaScores[session.interviewerPersona].count++;
        personaScores[session.interviewerPersona].totalScore += score;
      }
    }

    // Вычисляем средние
    for (const persona of Object.keys(personaScores)) {
      if (personaScores[persona].count > 0) {
        personaScores[persona].avgScore = Math.round(
          personaScores[persona].totalScore / personaScores[persona].count
        );
      }
      delete personaScores[persona].totalScore;
    }

    // Стрессоустойчивость - оценка с strict_hr
    const stressResistanceScore = personaScores.strict_hr.avgScore;

    // Коммуникация - средняя оценка по всем персонам
    const avgScore = completedSessions.length > 0 ? Math.round(totalScore / completedSessions.length) : 0;

    return {
      sessionsCompleted: completedSessions.length,
      totalSessions: sessions.length,
      avgScore,
      maxScore,
      personaScores,
      communicationScore: avgScore,
      stressResistanceScore,
      avgDuration: completedSessions.length > 0 ? Math.round(totalDuration / completedSessions.length) : 0
    };
  }

  /**
   * Собираем данные из Roadmap
   */
  async collectRoadmapData(userId) {
    const progresses = await db.RoadmapProgress.findAll({
      where: { userId },
      include: [{ model: db.Roadmap, as: 'roadmap' }]
    });

    if (progresses.length === 0) {
      return {
        totalStarted: 0,
        totalCompleted: 0,
        avgProgress: 0,
        totalStepsCompleted: 0,
        categories: {},
        activeRoadmaps: []
      };
    }

    const categories = {};
    let totalProgress = 0;
    let totalStepsCompleted = 0;
    const activeRoadmaps = [];

    for (const progress of progresses) {
      totalProgress += progress.progress || 0;
      totalStepsCompleted += (progress.completedSteps || []).length;

      if (progress.roadmap) {
        // Категория roadmap
        const cat = progress.roadmap.category;
        const slug = progress.roadmap.slug;

        if (!categories[cat]) {
          categories[cat] = { count: 0, avgProgress: 0, totalProgress: 0 };
        }
        categories[cat].count++;
        categories[cat].totalProgress += progress.progress || 0;

        // Активные roadmaps
        if (progress.progress < 100) {
          activeRoadmaps.push({
            slug: progress.roadmap.slug,
            title: progress.roadmap.title,
            progress: progress.progress,
            category: cat
          });
        }
      }
    }

    // Вычисляем средний прогресс по категориям
    for (const cat of Object.keys(categories)) {
      categories[cat].avgProgress = Math.round(
        categories[cat].totalProgress / categories[cat].count
      );
      delete categories[cat].totalProgress;
    }

    const completedCount = progresses.filter(p => p.progress >= 100).length;

    return {
      totalStarted: progresses.length,
      totalCompleted: completedCount,
      avgProgress: progresses.length > 0 ? Math.round(totalProgress / progresses.length) : 0,
      totalStepsCompleted,
      categories,
      activeRoadmaps: activeRoadmaps.slice(0, 5)
    };
  }

  /**
   * Рассчитываем итоговый радар
   */
  calculateRadar(codebattle, resume, aiInterview, audioInterview, roadmap, quiz) {
    const radar = {};
    const breakdown = {};

    // === PROGRAMMING ===
    const progCB = this.calcProgrammingFromCodeBattle(codebattle);
    const progResume = this.calcProgrammingFromResume(resume);
    const progRoadmap = this.calcCategoryFromRoadmap(roadmap, 'programming');
    const progInterview = this.calcProgrammingFromInterview(aiInterview);

    breakdown.programming = { codebattle: progCB, resume: progResume, roadmap: progRoadmap, interview: progInterview };
    radar.programming = Math.round(
      progCB * WEIGHTS.programming.codebattle +
      progResume * WEIGHTS.programming.resume +
      progRoadmap * WEIGHTS.programming.roadmap +
      progInterview * WEIGHTS.programming.interview
    );

    // === ALGORITHMS ===
    const algoCB = this.calcAlgorithmsFromCodeBattle(codebattle);
    breakdown.algorithms = { codebattle: algoCB };
    radar.algorithms = Math.round(algoCB * WEIGHTS.algorithms.codebattle);

    // === DATABASES ===
    const dbQuiz = quiz?.categories?.databases || 0;
    const dbRoadmap = this.calcCategoryFromRoadmap(roadmap, 'databases');
    const dbResume = this.calcTechFromResume(resume, 'databases');
    const dbInterview = aiInterview.technologies?.sql || aiInterview.technologies?.postgresql || 0;

    breakdown.databases = { quiz: dbQuiz, roadmap: dbRoadmap, resume: dbResume, interview: dbInterview };
    radar.databases = Math.round(
      dbQuiz * WEIGHTS.databases.quiz +
      dbRoadmap * WEIGHTS.databases.roadmap +
      dbResume * WEIGHTS.databases.resume +
      dbInterview * WEIGHTS.databases.interview
    );

    // === CLOUD ===
    const cloudRoadmap = this.calcCategoryFromRoadmap(roadmap, 'cloud');
    const cloudQuiz = quiz?.categories?.cloud || 0;
    const cloudResume = this.calcTechFromResume(resume, 'cloud');

    breakdown.cloud = { roadmap: cloudRoadmap, quiz: cloudQuiz, resume: cloudResume };
    radar.cloud = Math.round(
      cloudRoadmap * WEIGHTS.cloud.roadmap +
      cloudQuiz * WEIGHTS.cloud.quiz +
      cloudResume * WEIGHTS.cloud.resume
    );

    // === DEVOPS ===
    const devopsRoadmap = this.calcCategoryFromRoadmap(roadmap, 'devops');
    const devopsQuiz = quiz?.categories?.devops || 0;
    const devopsResume = this.calcTechFromResume(resume, 'devops');

    breakdown.devops = { roadmap: devopsRoadmap, quiz: devopsQuiz, resume: devopsResume };
    radar.devops = Math.round(
      devopsRoadmap * WEIGHTS.devops.roadmap +
      devopsQuiz * WEIGHTS.devops.quiz +
      devopsResume * WEIGHTS.devops.resume
    );

    // === TESTING ===
    const testCB = this.calcTestingFromCodeBattle(codebattle);
    const testQuiz = quiz?.categories?.testing || 0;
    const testResume = this.calcTechFromResume(resume, 'testing');

    breakdown.testing = { codebattle: testCB, quiz: testQuiz, resume: testResume };
    radar.testing = Math.round(
      testCB * WEIGHTS.testing.codebattle +
      testQuiz * WEIGHTS.testing.quiz +
      testResume * WEIGHTS.testing.resume
    );

    // === NETWORKING ===
    const netQuiz = quiz?.categories?.networking || 0;
    const netRoadmap = this.calcCategoryFromRoadmap(roadmap, 'networking');
    const netResume = this.calcTechFromResume(resume, 'networking');

    breakdown.networking = { quiz: netQuiz, roadmap: netRoadmap, resume: netResume };
    radar.networking = Math.round(
      netQuiz * WEIGHTS.networking.quiz +
      netRoadmap * WEIGHTS.networking.roadmap +
      netResume * WEIGHTS.networking.resume
    );

    // === SECURITY ===
    const secQuiz = quiz?.categories?.security || 0;
    const secRoadmap = this.calcCategoryFromRoadmap(roadmap, 'security');
    const secResume = this.calcTechFromResume(resume, 'security');

    breakdown.security = { quiz: secQuiz, roadmap: secRoadmap, resume: secResume };
    radar.security = Math.round(
      secQuiz * WEIGHTS.security.quiz +
      secRoadmap * WEIGHTS.security.roadmap +
      secResume * WEIGHTS.security.resume
    );

    // === AI/ML ===
    const aiQuiz = quiz?.categories?.ai_ml || 0;
    const aiRoadmap = this.calcCategoryFromRoadmap(roadmap, 'ai_ml');
    const aiInterview_ = this.calcAIMLFromInterview(aiInterview);
    const aiResume = this.calcTechFromResume(resume, 'ai_ml');

    breakdown.ai_ml = { quiz: aiQuiz, roadmap: aiRoadmap, interview: aiInterview_, resume: aiResume };
    radar.ai_ml = Math.round(
      aiQuiz * WEIGHTS.ai_ml.quiz +
      aiRoadmap * WEIGHTS.ai_ml.roadmap +
      aiInterview_ * WEIGHTS.ai_ml.interview +
      aiResume * WEIGHTS.ai_ml.resume
    );

    // === DATA SCIENCE ===
    const dsQuiz = quiz?.categories?.data_science || 0;
    const dsRoadmap = this.calcCategoryFromRoadmap(roadmap, 'data_science');
    const dsResume = this.calcTechFromResume(resume, 'data_science');

    breakdown.data_science = { quiz: dsQuiz, roadmap: dsRoadmap, resume: dsResume };
    radar.data_science = Math.round(
      dsQuiz * WEIGHTS.data_science.quiz +
      dsRoadmap * WEIGHTS.data_science.roadmap +
      dsResume * WEIGHTS.data_science.resume
    );

    // === MANAGEMENT ===
    const mgmtRoadmap = this.calcCategoryFromRoadmap(roadmap, 'management');
    const mgmtQuiz = quiz?.categories?.management || 0;
    const mgmtResume = this.calcTechFromResume(resume, 'management');

    breakdown.management = { roadmap: mgmtRoadmap, quiz: mgmtQuiz, resume: mgmtResume };
    radar.management = Math.round(
      mgmtRoadmap * WEIGHTS.management.roadmap +
      mgmtQuiz * WEIGHTS.management.quiz +
      mgmtResume * WEIGHTS.management.resume
    );

    // === UI/UX ===
    const uiRoadmap = this.calcCategoryFromRoadmap(roadmap, 'ui_ux');
    const uiQuiz = quiz?.categories?.ui_ux || 0;
    const uiResume = this.calcTechFromResume(resume, 'ui_ux');

    breakdown.ui_ux = { roadmap: uiRoadmap, quiz: uiQuiz, resume: uiResume };
    radar.ui_ux = Math.round(
      uiRoadmap * WEIGHTS.ui_ux.roadmap +
      uiQuiz * WEIGHTS.ui_ux.quiz +
      uiResume * WEIGHTS.ui_ux.resume
    );

    // === MOBILE ===
    const mobRoadmap = this.calcCategoryFromRoadmap(roadmap, 'mobile');
    const mobQuiz = quiz?.categories?.mobile || 0;
    const mobCB = this.calcMobileFromCodeBattle(codebattle);
    const mobResume = this.calcTechFromResume(resume, 'mobile');

    breakdown.mobile = { roadmap: mobRoadmap, quiz: mobQuiz, codebattle: mobCB, resume: mobResume };
    radar.mobile = Math.round(
      mobRoadmap * WEIGHTS.mobile.roadmap +
      mobQuiz * WEIGHTS.mobile.quiz +
      mobCB * WEIGHTS.mobile.codebattle +
      mobResume * WEIGHTS.mobile.resume
    );

    // === COMMUNICATION (Soft Skills) ===
    const commAudio = audioInterview.communicationScore || 0;
    const commAI = aiInterview.avgScore || 0;

    breakdown.communication = { audioInterview: commAudio, aiInterview: commAI };
    radar.communication = Math.round(
      commAudio * WEIGHTS.communication.audioInterview +
      commAI * WEIGHTS.communication.aiInterview
    );

    // Нормализуем все значения до 0-100
    for (const key of Object.keys(radar)) {
      radar[key] = Math.max(0, Math.min(100, radar[key]));
    }

    return { radar, breakdown };
  }

  /**
   * Вспомогательные методы расчёта
   */

  calcProgrammingFromCodeBattle(cb) {
    if (!cb.totalSolved) return 0;

    // Базовый балл за решённые задачи (до 40)
    const solvedScore = Math.min(40, cb.totalSolved * 2);

    // Бонус за сложные задачи (до 30)
    const difficultyScore = Math.min(30, cb.mediumSolved * 2 + cb.hardSolved * 5);

    // Бонус за рейтинг (до 30)
    const ratingScore = Math.min(30, Math.max(0, (cb.rating - 1000) / 20));

    return Math.min(100, solvedScore + difficultyScore + ratingScore);
  }

  calcProgrammingFromResume(resume) {
    if (!resume.technologies || resume.technologies.length === 0) return 0;

    const progTechs = resume.technologies.filter(t =>
      TECH_CATEGORIES.programming.some(pt => t.includes(pt))
    );

    // До 50 баллов за технологии
    const techScore = Math.min(50, progTechs.length * 10);

    // До 30 баллов за уровень
    const levelScores = { junior: 10, middle: 20, senior: 30, lead: 30 };
    const levelScore = levelScores[resume.level] || 0;

    // До 20 баллов за заполненность
    const completenessScore = resume.completeness * 0.2;

    return Math.min(100, techScore + levelScore + completenessScore);
  }

  calcProgrammingFromInterview(aiInterview) {
    if (!aiInterview.sessionsCompleted) return 0;

    const directions = aiInterview.directions || {};
    let score = 0;

    if (directions.frontend?.avgScore) score = Math.max(score, directions.frontend.avgScore);
    if (directions.backend?.avgScore) score = Math.max(score, directions.backend.avgScore);
    if (directions.fullstack?.avgScore) score = Math.max(score, directions.fullstack.avgScore);

    return score;
  }

  calcAlgorithmsFromCodeBattle(cb) {
    if (!cb.totalSolved) return 0;

    // Базовый балл за решённые задачи (до 30)
    const solvedScore = Math.min(30, cb.totalSolved * 1.5);

    // Бонус за алгоритмические задачи (до 30)
    const algoCategories = ['algorithms', 'data-structures', 'sorting', 'searching', 'recursion', 'dynamic-programming', 'graphs', 'trees'];
    let algoCatSolved = 0;
    for (const cat of algoCategories) {
      algoCatSolved += cb.categories?.[cat] || 0;
    }
    const algoScore = Math.min(30, algoCatSolved * 3);

    // Бонус за hard задачи (до 25)
    const hardScore = Math.min(25, cb.hardSolved * 5);

    // Бонус за скорость (до 15)
    const speedScore = cb.avgSolveTime > 0 && cb.avgSolveTime < 300
      ? Math.min(15, Math.round((300 - cb.avgSolveTime) / 20))
      : 0;

    return Math.min(100, solvedScore + algoScore + hardScore + speedScore);
  }

  calcTestingFromCodeBattle(cb) {
    if (!cb.totalSolved) return 0;

    // Балл за успешные решения с первой попытки
    return Math.min(100, cb.firstAttemptSuccess);
  }

  calcMobileFromCodeBattle(cb) {
    // Минимальный вклад от CodeBattle для mobile
    const mobileLanguages = ['kotlin', 'swift', 'dart'];
    let score = 0;

    for (const lang of mobileLanguages) {
      if (cb.languages?.[lang]) {
        score += cb.languages[lang] * 5;
      }
    }

    return Math.min(100, score);
  }

  calcCategoryFromRoadmap(roadmap, category) {
    if (!roadmap.totalStarted) return 0;

    // Ищем roadmaps связанные с категорией
    let relevantProgress = 0;
    let count = 0;

    for (const [roadmapCategory, roadmapMappings] of Object.entries(ROADMAP_CATEGORIES)) {
      for (const [slug, mappedCategories] of Object.entries(roadmapMappings)) {
        if (mappedCategories.includes(category)) {
          // Проверяем есть ли прогресс по этому roadmap
          const active = roadmap.activeRoadmaps?.find(r => r.slug === slug);
          if (active) {
            relevantProgress += active.progress;
            count++;
          }
        }
      }
    }

    // Также учитываем категории roadmap напрямую
    const catData = roadmap.categories?.[category];
    if (catData?.avgProgress) {
      relevantProgress += catData.avgProgress;
      count++;
    }

    if (count === 0) return 0;
    return Math.min(100, Math.round(relevantProgress / count));
  }

  calcTechFromResume(resume, category) {
    if (!resume.technologies || resume.technologies.length === 0) return 0;

    const categoryTechs = TECH_CATEGORIES[category] || [];
    const matchedTechs = resume.technologies.filter(t =>
      categoryTechs.some(ct => t.includes(ct))
    );

    // До 100 баллов за технологии в категории
    return Math.min(100, matchedTechs.length * 20);
  }

  calcAIMLFromInterview(aiInterview) {
    // Если проходил интервью по ML/AI направлениям
    const techs = aiInterview.technologies || {};
    let score = 0;

    const mlTechs = ['tensorflow', 'pytorch', 'keras', 'scikit-learn', 'machine learning', 'deep learning'];
    for (const tech of mlTechs) {
      if (techs[tech]) {
        score += 20;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Генерация рекомендаций
   */
  generateRecommendations(radar, breakdown, sources) {
    const recommendations = [];

    // Анализируем слабые места
    const weakAreas = Object.entries(radar)
      .filter(([_, value]) => value < 30)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3);

    for (const [area, value] of weakAreas) {
      const rec = this.getRecommendationForArea(area, value, breakdown[area], sources);
      if (rec) {
        recommendations.push(rec);
      }
    }

    // Рекомендации по улучшению
    if (sources.codebattle.totalSolved < 10) {
      recommendations.push({
        type: 'action',
        area: 'codebattle',
        titleKey: 'autoRadar.recommendations.codebattle.title',
        descriptionKey: 'autoRadar.recommendations.codebattle.description',
        priority: 'high',
        icon: '🎮'
      });
    }

    if (sources.resume.completeness < 50) {
      recommendations.push({
        type: 'action',
        area: 'resume',
        titleKey: 'autoRadar.recommendations.resume.title',
        descriptionKey: 'autoRadar.recommendations.resume.description',
        priority: 'high',
        icon: '📄'
      });
    }

    if (sources.aiInterview.sessionsCompleted === 0) {
      recommendations.push({
        type: 'action',
        area: 'interview',
        titleKey: 'autoRadar.recommendations.interview.title',
        descriptionKey: 'autoRadar.recommendations.interview.description',
        priority: 'medium',
        icon: '🤖'
      });
    }

    if (sources.roadmap.totalStarted === 0) {
      recommendations.push({
        type: 'action',
        area: 'roadmap',
        titleKey: 'autoRadar.recommendations.roadmap.title',
        descriptionKey: 'autoRadar.recommendations.roadmap.description',
        priority: 'medium',
        icon: '🗺️'
      });
    }

    return recommendations.slice(0, 5);
  }

  getRecommendationForArea(area, value, breakdown, sources) {
    return {
      type: 'improvement',
      area,
      titleKey: `autoRadar.recommendations.improve.${area}.title`,
      descriptionKey: `autoRadar.recommendations.improve.${area}.description`,
      currentValue: value,
      priority: value < 20 ? 'high' : 'medium',
      icon: '📈'
    };
  }

  /**
   * Проверка достижений
   */
  checkAchievements(skillScore) {
    const achievements = skillScore.achievements || [];
    const newAchievements = [];
    const cb = skillScore.codebattle;
    const radar = skillScore.calculatedRadar;

    const achievementDefs = [
      {
        id: 'first_blood',
        name: 'Первая кровь',
        description: 'Решите первую задачу в Code Battle',
        icon: '🩸',
        check: () => cb.totalSolved >= 1
      },
      {
        id: 'solver_10',
        name: 'Решатель',
        description: 'Решите 10 задач в Code Battle',
        icon: '🧩',
        check: () => cb.totalSolved >= 10
      },
      {
        id: 'solver_50',
        name: 'Мастер задач',
        description: 'Решите 50 задач в Code Battle',
        icon: '🎯',
        check: () => cb.totalSolved >= 50
      },
      {
        id: 'hard_solver',
        name: 'Хардкорщик',
        description: 'Решите 5 hard задач',
        icon: '💪',
        check: () => cb.hardSolved >= 5
      },
      {
        id: 'speed_demon',
        name: 'Спидраннер',
        description: 'Решите задачу менее чем за 2 минуты',
        icon: '⚡',
        check: () => cb.avgSolveTime > 0 && cb.avgSolveTime < 120
      },
      {
        id: 'ai_slayer',
        name: 'Победитель AI',
        description: 'Победите AI 5 раз',
        icon: '🤖',
        check: () => cb.beatAiCount >= 5
      },
      {
        id: 'polyglot',
        name: 'Полиглот',
        description: 'Решайте задачи на 3+ языках',
        icon: '🌍',
        check: () => Object.keys(cb.languages || {}).length >= 3
      },
      {
        id: 'gold_league',
        name: 'Золотая лига',
        description: 'Достигните золотой лиги',
        icon: '🥇',
        check: () => ['gold', 'platinum', 'diamond', 'master', 'grandmaster'].includes(cb.league)
      },
      {
        id: 'balanced',
        name: 'Баланс',
        description: 'Получите 50+ баллов в 5 категориях радара',
        icon: '⚖️',
        check: () => Object.values(radar).filter(v => v >= 50).length >= 5
      },
      {
        id: 'expert',
        name: 'Эксперт',
        description: 'Получите 80+ баллов в любой категории',
        icon: '🏆',
        check: () => Object.values(radar).some(v => v >= 80)
      }
    ];

    // Проверяем каждое достижение
    for (const def of achievementDefs) {
      const hasAchievement = achievements.some(a => a.id === def.id);
      if (!hasAchievement && def.check()) {
        newAchievements.push({
          id: def.id,
          name: def.name,
          description: def.description,
          icon: def.icon,
          unlockedAt: new Date().toISOString()
        });
      }
    }

    return [...achievements, ...newAchievements];
  }

  /**
   * Триггер пересчёта (вызывается из других сервисов)
   */
  async triggerRecalculation(userId, source) {
    console.log(`[SkillAggregator] Triggering recalculation for user ${userId} from ${source}`);

    // Асинхронный пересчёт (не блокирует вызывающий код)
    setImmediate(async () => {
      try {
        const skillScore = await this.recalculateRadar(userId);
        console.log(`[SkillAggregator] Recalculation completed for user ${userId}`);

        // Синхронизируем план развития с обновлённым радаром
        try {
          const developmentPlanSync = require('./developmentPlanSync.service');
          await developmentPlanSync.syncWithRadar(userId, skillScore);
          console.log(`[SkillAggregator] Development plan synced for user ${userId}`);
        } catch (syncError) {
          console.error(`[SkillAggregator] Development plan sync failed for user ${userId}:`, syncError);
        }
      } catch (error) {
        console.error(`[SkillAggregator] Recalculation failed for user ${userId}:`, error);
      }
    });
  }
}

module.exports = new SkillAggregatorService();