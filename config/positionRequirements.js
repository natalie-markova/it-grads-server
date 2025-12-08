/**
 * Конфигурация требований для каждой специализации/позиции
 *
 * Структура:
 * - title/titleEn: Название позиции
 * - icon: Эмодзи для отображения
 * - level: Уровень (junior/middle/senior/lead)
 * - category: Категория (frontend/backend/fullstack/data/devops/mobile/qa/security)
 * - skills: Требуемые значения навыков (0-100)
 * - requiredRoadmaps: Обязательные roadmap для прохождения
 * - codebattle: Требования по CodeBattle
 * - relatedPositions: Связанные позиции для рекомендаций
 */

const POSITION_REQUIREMENTS = {
  // =====================================================
  // FRONTEND
  // =====================================================
  'junior-frontend': {
    title: 'Junior Frontend Developer',
    titleEn: 'Junior Frontend Developer',
    icon: '🎨',
    level: 'junior',
    category: 'frontend',
    skills: {
      programming: 40,
      algorithms: 25,
      ui_ux: 35,
      testing: 15
    },
    requiredRoadmaps: ['javascript'],
    codebattle: {
      minRating: 900,
      minSolved: 15,
      requiredCategories: ['arrays', 'strings']
    },
    relatedPositions: ['middle-frontend', 'junior-fullstack']
  },

  'middle-frontend': {
    title: 'Middle Frontend Developer',
    titleEn: 'Middle Frontend Developer',
    icon: '🎨',
    level: 'middle',
    category: 'frontend',
    skills: {
      programming: 70,
      algorithms: 50,
      ui_ux: 65,
      testing: 45,
      devops: 25
    },
    requiredRoadmaps: ['javascript', 'typescript', 'react'],
    codebattle: {
      minRating: 1300,
      minSolved: 50,
      requiredCategories: ['algorithms', 'data-structures', 'arrays', 'strings']
    },
    relatedPositions: ['senior-frontend', 'middle-fullstack', 'mobile-developer']
  },

  'senior-frontend': {
    title: 'Senior Frontend Developer',
    titleEn: 'Senior Frontend Developer',
    icon: '🎨',
    level: 'senior',
    category: 'frontend',
    skills: {
      programming: 85,
      algorithms: 70,
      ui_ux: 80,
      testing: 65,
      devops: 45,
      management: 35,
      security: 40
    },
    requiredRoadmaps: ['javascript', 'typescript', 'react', 'testing'],
    codebattle: {
      minRating: 1600,
      minSolved: 100,
      requiredCategories: ['algorithms', 'data-structures', 'dynamic-programming']
    },
    relatedPositions: ['frontend-lead', 'senior-fullstack']
  },

  'frontend-lead': {
    title: 'Frontend Team Lead',
    titleEn: 'Frontend Team Lead',
    icon: '👑',
    level: 'lead',
    category: 'frontend',
    skills: {
      programming: 85,
      algorithms: 65,
      ui_ux: 75,
      testing: 60,
      devops: 50,
      management: 70,
      communication: 75,
      security: 45
    },
    requiredRoadmaps: ['javascript', 'typescript', 'react', 'testing'],
    codebattle: {
      minRating: 1600,
      minSolved: 80
    },
    relatedPositions: ['senior-frontend', 'fullstack-lead']
  },

  // =====================================================
  // BACKEND
  // =====================================================
  'junior-backend': {
    title: 'Junior Backend Developer',
    titleEn: 'Junior Backend Developer',
    icon: '⚙️',
    level: 'junior',
    category: 'backend',
    skills: {
      programming: 40,
      algorithms: 30,
      databases: 35,
      networking: 20
    },
    requiredRoadmaps: ['python'],
    codebattle: {
      minRating: 950,
      minSolved: 20,
      requiredCategories: ['algorithms', 'sql']
    },
    relatedPositions: ['middle-backend', 'junior-fullstack']
  },

  'middle-backend': {
    title: 'Middle Backend Developer',
    titleEn: 'Middle Backend Developer',
    icon: '⚙️',
    level: 'middle',
    category: 'backend',
    skills: {
      programming: 70,
      algorithms: 60,
      databases: 70,
      networking: 50,
      devops: 40,
      security: 45
    },
    requiredRoadmaps: ['python', 'postgresql', 'docker'],
    codebattle: {
      minRating: 1400,
      minSolved: 70,
      requiredCategories: ['algorithms', 'data-structures', 'sql', 'databases']
    },
    relatedPositions: ['senior-backend', 'middle-fullstack', 'devops-engineer']
  },

  'senior-backend': {
    title: 'Senior Backend Developer',
    titleEn: 'Senior Backend Developer',
    icon: '⚙️',
    level: 'senior',
    category: 'backend',
    skills: {
      programming: 85,
      algorithms: 75,
      databases: 85,
      networking: 70,
      devops: 60,
      security: 65,
      cloud: 55,
      management: 35
    },
    requiredRoadmaps: ['python', 'postgresql', 'docker', 'kubernetes'],
    codebattle: {
      minRating: 1700,
      minSolved: 120,
      requiredCategories: ['algorithms', 'data-structures', 'dynamic-programming', 'graphs']
    },
    relatedPositions: ['backend-lead', 'senior-fullstack', 'devops-engineer']
  },

  'backend-lead': {
    title: 'Backend Team Lead',
    titleEn: 'Backend Team Lead',
    icon: '👑',
    level: 'lead',
    category: 'backend',
    skills: {
      programming: 85,
      algorithms: 70,
      databases: 80,
      networking: 65,
      devops: 55,
      security: 60,
      cloud: 50,
      management: 70,
      communication: 70
    },
    requiredRoadmaps: ['python', 'postgresql', 'docker'],
    codebattle: {
      minRating: 1600,
      minSolved: 100
    },
    relatedPositions: ['senior-backend', 'fullstack-lead']
  },

  // =====================================================
  // FULLSTACK
  // =====================================================
  'junior-fullstack': {
    title: 'Junior Fullstack Developer',
    titleEn: 'Junior Fullstack Developer',
    icon: '🔄',
    level: 'junior',
    category: 'fullstack',
    skills: {
      programming: 40,
      algorithms: 25,
      databases: 30,
      ui_ux: 30,
      networking: 20
    },
    requiredRoadmaps: ['javascript'],
    codebattle: {
      minRating: 900,
      minSolved: 20
    },
    relatedPositions: ['middle-fullstack', 'junior-frontend', 'junior-backend']
  },

  'middle-fullstack': {
    title: 'Middle Fullstack Developer',
    titleEn: 'Middle Fullstack Developer',
    icon: '🔄',
    level: 'middle',
    category: 'fullstack',
    skills: {
      programming: 70,
      algorithms: 50,
      databases: 60,
      ui_ux: 55,
      devops: 40,
      testing: 45,
      networking: 45
    },
    requiredRoadmaps: ['javascript', 'react', 'nodejs', 'postgresql'],
    codebattle: {
      minRating: 1350,
      minSolved: 60
    },
    relatedPositions: ['senior-fullstack', 'middle-frontend', 'middle-backend']
  },

  'senior-fullstack': {
    title: 'Senior Fullstack Developer',
    titleEn: 'Senior Fullstack Developer',
    icon: '🔄',
    level: 'senior',
    category: 'fullstack',
    skills: {
      programming: 85,
      algorithms: 70,
      databases: 75,
      ui_ux: 70,
      devops: 55,
      testing: 60,
      networking: 60,
      security: 50,
      cloud: 45,
      management: 35
    },
    requiredRoadmaps: ['javascript', 'typescript', 'react', 'nodejs', 'postgresql', 'docker'],
    codebattle: {
      minRating: 1600,
      minSolved: 100
    },
    relatedPositions: ['fullstack-lead', 'senior-frontend', 'senior-backend']
  },

  'fullstack-lead': {
    title: 'Fullstack Team Lead',
    titleEn: 'Fullstack Team Lead',
    icon: '👑',
    level: 'lead',
    category: 'fullstack',
    skills: {
      programming: 85,
      algorithms: 65,
      databases: 70,
      ui_ux: 65,
      devops: 50,
      testing: 55,
      management: 75,
      communication: 75,
      security: 50
    },
    requiredRoadmaps: ['javascript', 'typescript', 'react', 'nodejs', 'postgresql'],
    codebattle: {
      minRating: 1550,
      minSolved: 90
    },
    relatedPositions: ['senior-fullstack', 'frontend-lead', 'backend-lead']
  },

  // =====================================================
  // DATA & ML
  // =====================================================
  'junior-data-analyst': {
    title: 'Junior Data Analyst',
    titleEn: 'Junior Data Analyst',
    icon: '📊',
    level: 'junior',
    category: 'data',
    skills: {
      programming: 30,
      algorithms: 25,
      data_science: 40,
      databases: 35
    },
    requiredRoadmaps: ['python', 'data-science'],
    codebattle: {
      minRating: 900,
      minSolved: 15
    },
    relatedPositions: ['data-analyst', 'junior-data-scientist']
  },

  'data-analyst': {
    title: 'Data Analyst',
    titleEn: 'Data Analyst',
    icon: '📊',
    level: 'middle',
    category: 'data',
    skills: {
      programming: 50,
      algorithms: 40,
      data_science: 70,
      databases: 60,
      ai_ml: 30
    },
    requiredRoadmaps: ['python', 'data-science', 'postgresql'],
    codebattle: {
      minRating: 1100,
      minSolved: 30
    },
    relatedPositions: ['data-scientist', 'middle-backend']
  },

  'junior-data-scientist': {
    title: 'Junior Data Scientist',
    titleEn: 'Junior Data Scientist',
    icon: '🔬',
    level: 'junior',
    category: 'data',
    skills: {
      programming: 40,
      algorithms: 45,
      data_science: 50,
      ai_ml: 40,
      databases: 30
    },
    requiredRoadmaps: ['python', 'data-science'],
    codebattle: {
      minRating: 1000,
      minSolved: 30
    },
    relatedPositions: ['data-scientist', 'data-analyst']
  },

  'data-scientist': {
    title: 'Data Scientist',
    titleEn: 'Data Scientist',
    icon: '🔬',
    level: 'middle',
    category: 'data',
    skills: {
      programming: 65,
      algorithms: 70,
      data_science: 80,
      ai_ml: 70,
      databases: 50,
      cloud: 30
    },
    requiredRoadmaps: ['python', 'data-science', 'ml-engineer'],
    codebattle: {
      minRating: 1400,
      minSolved: 60
    },
    relatedPositions: ['senior-data-scientist', 'ml-engineer']
  },

  'senior-data-scientist': {
    title: 'Senior Data Scientist',
    titleEn: 'Senior Data Scientist',
    icon: '🔬',
    level: 'senior',
    category: 'data',
    skills: {
      programming: 75,
      algorithms: 80,
      data_science: 90,
      ai_ml: 85,
      databases: 60,
      cloud: 45,
      management: 40
    },
    requiredRoadmaps: ['python', 'data-science', 'ml-engineer'],
    codebattle: {
      minRating: 1600,
      minSolved: 100
    },
    relatedPositions: ['ml-engineer', 'data-lead']
  },

  'ml-engineer': {
    title: 'ML Engineer',
    titleEn: 'ML Engineer',
    icon: '🤖',
    level: 'middle',
    category: 'data',
    skills: {
      programming: 75,
      algorithms: 80,
      ai_ml: 80,
      data_science: 65,
      cloud: 45,
      devops: 40
    },
    requiredRoadmaps: ['python', 'ml-engineer'],
    codebattle: {
      minRating: 1500,
      minSolved: 80
    },
    relatedPositions: ['senior-ml-engineer', 'data-scientist']
  },

  'senior-ml-engineer': {
    title: 'Senior ML Engineer',
    titleEn: 'Senior ML Engineer',
    icon: '🤖',
    level: 'senior',
    category: 'data',
    skills: {
      programming: 85,
      algorithms: 90,
      ai_ml: 90,
      data_science: 75,
      cloud: 60,
      devops: 55,
      management: 35
    },
    requiredRoadmaps: ['python', 'ml-engineer', 'docker', 'kubernetes'],
    codebattle: {
      minRating: 1800,
      minSolved: 120
    },
    relatedPositions: ['ml-lead', 'senior-data-scientist']
  },

  // =====================================================
  // DEVOPS & CLOUD
  // =====================================================
  'junior-devops': {
    title: 'Junior DevOps Engineer',
    titleEn: 'Junior DevOps Engineer',
    icon: '🛠️',
    level: 'junior',
    category: 'devops',
    skills: {
      devops: 40,
      networking: 35,
      programming: 30,
      cloud: 25,
      security: 20
    },
    requiredRoadmaps: ['docker'],
    codebattle: {
      minRating: 900,
      minSolved: 15
    },
    relatedPositions: ['devops-engineer']
  },

  'devops-engineer': {
    title: 'DevOps Engineer',
    titleEn: 'DevOps Engineer',
    icon: '🛠️',
    level: 'middle',
    category: 'devops',
    skills: {
      devops: 75,
      cloud: 65,
      networking: 60,
      security: 50,
      programming: 45,
      databases: 40
    },
    requiredRoadmaps: ['docker', 'kubernetes', 'aws'],
    codebattle: {
      minRating: 1200,
      minSolved: 40
    },
    relatedPositions: ['senior-devops', 'cloud-architect', 'sre-engineer']
  },

  'senior-devops': {
    title: 'Senior DevOps Engineer',
    titleEn: 'Senior DevOps Engineer',
    icon: '🛠️',
    level: 'senior',
    category: 'devops',
    skills: {
      devops: 90,
      cloud: 80,
      networking: 75,
      security: 70,
      programming: 55,
      databases: 50,
      management: 40
    },
    requiredRoadmaps: ['docker', 'kubernetes', 'aws', 'security'],
    codebattle: {
      minRating: 1400,
      minSolved: 60
    },
    relatedPositions: ['devops-lead', 'cloud-architect']
  },

  'cloud-architect': {
    title: 'Cloud Architect',
    titleEn: 'Cloud Architect',
    icon: '☁️',
    level: 'senior',
    category: 'devops',
    skills: {
      cloud: 90,
      devops: 80,
      networking: 80,
      security: 75,
      databases: 60,
      programming: 50,
      management: 50
    },
    requiredRoadmaps: ['aws', 'docker', 'kubernetes'],
    codebattle: {
      minRating: 1400,
      minSolved: 50
    },
    relatedPositions: ['senior-devops', 'devops-lead']
  },

  'sre-engineer': {
    title: 'Site Reliability Engineer',
    titleEn: 'Site Reliability Engineer',
    icon: '🔧',
    level: 'middle',
    category: 'devops',
    skills: {
      devops: 70,
      networking: 70,
      programming: 60,
      cloud: 60,
      security: 50,
      databases: 45
    },
    requiredRoadmaps: ['docker', 'kubernetes'],
    codebattle: {
      minRating: 1300,
      minSolved: 50
    },
    relatedPositions: ['senior-devops', 'devops-engineer']
  },

  // =====================================================
  // MOBILE
  // =====================================================
  'junior-mobile': {
    title: 'Junior Mobile Developer',
    titleEn: 'Junior Mobile Developer',
    icon: '📱',
    level: 'junior',
    category: 'mobile',
    skills: {
      programming: 40,
      mobile: 40,
      ui_ux: 35,
      algorithms: 25
    },
    requiredRoadmaps: ['react-native'],
    codebattle: {
      minRating: 900,
      minSolved: 15
    },
    relatedPositions: ['mobile-developer']
  },

  'mobile-developer': {
    title: 'Mobile Developer',
    titleEn: 'Mobile Developer',
    icon: '📱',
    level: 'middle',
    category: 'mobile',
    skills: {
      programming: 65,
      mobile: 75,
      ui_ux: 60,
      algorithms: 45,
      testing: 40,
      networking: 35
    },
    requiredRoadmaps: ['react-native'],
    codebattle: {
      minRating: 1250,
      minSolved: 45
    },
    relatedPositions: ['senior-mobile', 'middle-frontend']
  },

  'senior-mobile': {
    title: 'Senior Mobile Developer',
    titleEn: 'Senior Mobile Developer',
    icon: '📱',
    level: 'senior',
    category: 'mobile',
    skills: {
      programming: 80,
      mobile: 90,
      ui_ux: 75,
      algorithms: 60,
      testing: 55,
      networking: 50,
      devops: 35,
      management: 35
    },
    requiredRoadmaps: ['react-native', 'flutter'],
    codebattle: {
      minRating: 1500,
      minSolved: 80
    },
    relatedPositions: ['mobile-lead', 'senior-frontend']
  },

  // =====================================================
  // QA
  // =====================================================
  'junior-qa': {
    title: 'Junior QA Engineer',
    titleEn: 'Junior QA Engineer',
    icon: '🧪',
    level: 'junior',
    category: 'qa',
    skills: {
      testing: 45,
      programming: 25,
      databases: 20
    },
    requiredRoadmaps: ['testing'],
    codebattle: {
      minRating: 800,
      minSolved: 10
    },
    relatedPositions: ['qa-engineer']
  },

  'qa-engineer': {
    title: 'QA Engineer',
    titleEn: 'QA Engineer',
    icon: '🧪',
    level: 'middle',
    category: 'qa',
    skills: {
      testing: 80,
      programming: 50,
      databases: 40,
      devops: 30,
      networking: 30
    },
    requiredRoadmaps: ['testing'],
    codebattle: {
      minRating: 1100,
      minSolved: 30
    },
    relatedPositions: ['senior-qa', 'qa-automation']
  },

  'qa-automation': {
    title: 'QA Automation Engineer',
    titleEn: 'QA Automation Engineer',
    icon: '🤖',
    level: 'middle',
    category: 'qa',
    skills: {
      testing: 85,
      programming: 65,
      databases: 45,
      devops: 40
    },
    requiredRoadmaps: ['testing', 'javascript'],
    codebattle: {
      minRating: 1200,
      minSolved: 40
    },
    relatedPositions: ['senior-qa', 'qa-engineer', 'middle-backend']
  },

  'senior-qa': {
    title: 'Senior QA Engineer',
    titleEn: 'Senior QA Engineer',
    icon: '🧪',
    level: 'senior',
    category: 'qa',
    skills: {
      testing: 90,
      programming: 60,
      databases: 50,
      devops: 45,
      management: 40,
      security: 35
    },
    requiredRoadmaps: ['testing', 'javascript', 'docker'],
    codebattle: {
      minRating: 1300,
      minSolved: 50
    },
    relatedPositions: ['qa-lead', 'qa-automation']
  },

  // =====================================================
  // SECURITY
  // =====================================================
  'junior-security': {
    title: 'Junior Security Engineer',
    titleEn: 'Junior Security Engineer',
    icon: '🔐',
    level: 'junior',
    category: 'security',
    skills: {
      security: 40,
      networking: 35,
      programming: 30
    },
    requiredRoadmaps: ['security'],
    codebattle: {
      minRating: 900,
      minSolved: 15
    },
    relatedPositions: ['security-engineer']
  },

  'security-engineer': {
    title: 'Security Engineer',
    titleEn: 'Security Engineer',
    icon: '🔐',
    level: 'middle',
    category: 'security',
    skills: {
      security: 80,
      networking: 70,
      programming: 55,
      devops: 45,
      cloud: 40
    },
    requiredRoadmaps: ['security'],
    codebattle: {
      minRating: 1300,
      minSolved: 50
    },
    relatedPositions: ['senior-security', 'devops-engineer']
  },

  'senior-security': {
    title: 'Senior Security Engineer',
    titleEn: 'Senior Security Engineer',
    icon: '🔐',
    level: 'senior',
    category: 'security',
    skills: {
      security: 90,
      networking: 80,
      programming: 65,
      devops: 55,
      cloud: 55,
      management: 40
    },
    requiredRoadmaps: ['security', 'docker', 'aws'],
    codebattle: {
      minRating: 1500,
      minSolved: 70
    },
    relatedPositions: ['security-lead', 'cloud-architect']
  }
};

// Категории позиций для фильтрации
const POSITION_CATEGORIES = {
  frontend: {
    title: 'Frontend',
    titleEn: 'Frontend',
    icon: '🎨',
    color: '#3B82F6'
  },
  backend: {
    title: 'Backend',
    titleEn: 'Backend',
    icon: '⚙️',
    color: '#10B981'
  },
  fullstack: {
    title: 'Fullstack',
    titleEn: 'Fullstack',
    icon: '🔄',
    color: '#8B5CF6'
  },
  data: {
    title: 'Data & ML',
    titleEn: 'Data & ML',
    icon: '📊',
    color: '#F59E0B'
  },
  devops: {
    title: 'DevOps & Cloud',
    titleEn: 'DevOps & Cloud',
    icon: '🛠️',
    color: '#EF4444'
  },
  mobile: {
    title: 'Mobile',
    titleEn: 'Mobile',
    icon: '📱',
    color: '#EC4899'
  },
  qa: {
    title: 'QA',
    titleEn: 'QA',
    icon: '🧪',
    color: '#06B6D4'
  },
  security: {
    title: 'Security',
    titleEn: 'Security',
    icon: '🔐',
    color: '#6366F1'
  }
};

// Уровни позиций
const POSITION_LEVELS = {
  junior: {
    title: 'Junior',
    titleEn: 'Junior',
    order: 1,
    color: '#22C55E'
  },
  middle: {
    title: 'Middle',
    titleEn: 'Middle',
    order: 2,
    color: '#3B82F6'
  },
  senior: {
    title: 'Senior',
    titleEn: 'Senior',
    order: 3,
    color: '#8B5CF6'
  },
  lead: {
    title: 'Lead',
    titleEn: 'Lead',
    order: 4,
    color: '#F59E0B'
  }
};

/**
 * Получить требования для позиции
 */
function getPositionRequirements(positionId) {
  return POSITION_REQUIREMENTS[positionId] || null;
}

/**
 * Получить все позиции по категории
 */
function getPositionsByCategory(category) {
  return Object.entries(POSITION_REQUIREMENTS)
    .filter(([_, pos]) => pos.category === category)
    .map(([id, pos]) => ({ id, ...pos }));
}

/**
 * Получить все позиции по уровню
 */
function getPositionsByLevel(level) {
  return Object.entries(POSITION_REQUIREMENTS)
    .filter(([_, pos]) => pos.level === level)
    .map(([id, pos]) => ({ id, ...pos }));
}

/**
 * Получить все позиции
 */
function getAllPositions() {
  return Object.entries(POSITION_REQUIREMENTS)
    .map(([id, pos]) => ({ id, ...pos }));
}

/**
 * Рассчитать совпадение профиля с позицией
 */
function calculatePositionMatch(userRadar, positionId) {
  const requirements = POSITION_REQUIREMENTS[positionId];
  if (!requirements) return 0;

  let totalWeight = 0;
  let matchScore = 0;

  for (const [skill, requiredValue] of Object.entries(requirements.skills)) {
    const currentValue = userRadar[skill] || 0;
    const weight = requiredValue; // Важность = требуемый уровень

    // Процент достижения (макс 100%)
    const skillMatch = Math.min(100, (currentValue / requiredValue) * 100);

    matchScore += skillMatch * weight;
    totalWeight += weight * 100;
  }

  if (totalWeight === 0) return 0;
  return Math.round(matchScore / totalWeight * 100);
}

/**
 * Получить рекомендуемые позиции для пользователя
 */
function getRecommendedPositions(userRadar, limit = 6) {
  const positions = getAllPositions();

  const withMatch = positions.map(pos => ({
    ...pos,
    matchScore: calculatePositionMatch(userRadar, pos.id)
  }));

  // Сортируем по совпадению (от высокого к низкому)
  withMatch.sort((a, b) => b.matchScore - a.matchScore);

  return withMatch.slice(0, limit);
}

/**
 * Получить GAP между текущим профилем и позицией
 */
function getPositionGap(userRadar, positionId) {
  const requirements = POSITION_REQUIREMENTS[positionId];
  if (!requirements) return null;

  const gaps = {};
  let totalGap = 0;
  let skillCount = 0;

  for (const [skill, requiredValue] of Object.entries(requirements.skills)) {
    const currentValue = userRadar[skill] || 0;
    const gap = Math.max(0, requiredValue - currentValue);

    gaps[skill] = {
      current: currentValue,
      required: requiredValue,
      gap,
      progress: Math.min(100, Math.round((currentValue / requiredValue) * 100))
    };

    if (gap > 0) {
      totalGap += gap;
      skillCount++;
    }
  }

  return {
    gaps,
    totalGap,
    avgGap: skillCount > 0 ? Math.round(totalGap / skillCount) : 0,
    isReached: totalGap === 0
  };
}

module.exports = {
  POSITION_REQUIREMENTS,
  POSITION_CATEGORIES,
  POSITION_LEVELS,
  getPositionRequirements,
  getPositionsByCategory,
  getPositionsByLevel,
  getAllPositions,
  calculatePositionMatch,
  getRecommendedPositions,
  getPositionGap
};
