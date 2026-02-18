const db = require('./database');
const crypto = require('crypto');

function seedDatabase() {
  // Check if data already exists
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
  if (projectCount.count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  // Sample projects
  const insertProject = db.prepare(`
    INSERT INTO projects (name, description, color) VALUES (?, ?, ?)
  `);

  const projects = [
    { name: 'Website Redesign', description: 'Complete overhaul of the company website with modern design', color: '#3B82F6' },
    { name: 'Mobile App Development', description: 'Build cross-platform mobile application', color: '#10B981' },
    { name: 'API Integration', description: 'Integrate third-party APIs for payment and notifications', color: '#8B5CF6' }
  ];

  projects.forEach(p => insertProject.run(p.name, p.description, p.color));

  // Sample people (using UUID for TEXT primary key)
  const insertPerson = db.prepare(`
    INSERT INTO people (id, name, email, company, designation, project_id) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const people = [
    { id: crypto.randomUUID(), name: 'Alice Johnson', email: 'alice@techcorp.com', company: 'TechCorp', designation: 'Project Manager', projectId: 1 },
    { id: crypto.randomUUID(), name: 'Bob Smith', email: 'bob@designstudio.com', company: 'Design Studio', designation: 'Senior Designer', projectId: 1 },
    { id: crypto.randomUUID(), name: 'Carol Williams', email: 'carol@devagency.com', company: 'Dev Agency', designation: 'Full Stack Developer', projectId: 2 },
    { id: crypto.randomUUID(), name: 'David Brown', email: 'david@techcorp.com', company: 'TechCorp', designation: 'Backend Developer', projectId: 3 },
    { id: crypto.randomUUID(), name: 'Eve Martinez', email: 'eve@freelance.com', company: 'Freelance', designation: 'QA Engineer', projectId: null }
  ];

  const peopleIds = [];
  people.forEach(p => {
    insertPerson.run(p.id, p.name, p.email, p.company, p.designation, p.projectId);
    peopleIds.push(p.id);
  });

  // Sample tags (some global, some project-specific)
  const insertTag = db.prepare(`
    INSERT INTO tags (id, name, color, project_id) 
    VALUES (?, ?, ?, ?)
  `);

  const tags = [
    // Global tags
    { id: crypto.randomUUID(), name: 'Bug', color: '#EF4444', projectId: null },
    { id: crypto.randomUUID(), name: 'Feature', color: '#10B981', projectId: null },
    { id: crypto.randomUUID(), name: 'Enhancement', color: '#3B82F6', projectId: null },
    // Project-specific tags
    { id: crypto.randomUUID(), name: 'UI/UX', color: '#8B5CF6', projectId: 1 },
    { id: crypto.randomUUID(), name: 'Performance', color: '#F59E0B', projectId: 2 },
    { id: crypto.randomUUID(), name: 'Security', color: '#DC2626', projectId: 3 }
  ];

  const tagIds = [];
  tags.forEach(t => {
    insertTag.run(t.id, t.name, t.color, t.projectId);
    tagIds.push(t.id);
  });

  // Sample tasks
  const insertTask = db.prepare(`
    INSERT INTO tasks (project_id, title, description, status, priority, due_date, start_date, assignee_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tasks = [
    // Project 1 tasks (Website Redesign)
    { projectId: 1, title: 'Design homepage mockup', description: 'Create wireframes and high-fidelity mockups for the new homepage', status: 'done', priority: 'high', dueDate: '2024-02-10', startDate: '2024-02-01', assigneeId: peopleIds[1] }, // Bob
    { projectId: 1, title: 'Implement responsive navigation', description: 'Build mobile-first navigation component', status: 'in_progress', priority: 'high', dueDate: '2024-02-15', startDate: '2024-02-10', assigneeId: peopleIds[1] }, // Bob
    { projectId: 1, title: 'Create contact form', description: 'Design and implement the contact form with validation', status: 'todo', priority: 'medium', dueDate: '2024-02-20', startDate: null, assigneeId: null },
    { projectId: 1, title: 'Optimize images', description: 'Compress and optimize all images for web', status: 'backlog', priority: 'low', dueDate: null, startDate: null, assigneeId: null },

    // Project 2 tasks (Mobile App Development)
    { projectId: 2, title: 'Set up React Native project', description: 'Initialize the project with Expo and configure build tools', status: 'done', priority: 'urgent', dueDate: '2024-02-05', startDate: '2024-02-01', assigneeId: peopleIds[2] }, // Carol
    { projectId: 2, title: 'Implement user authentication', description: 'Add login, registration, and password reset functionality', status: 'review', priority: 'high', dueDate: '2024-02-18', startDate: '2024-02-10', assigneeId: peopleIds[2] }, // Carol
    { projectId: 2, title: 'Design onboarding flow', description: 'Create the onboarding screens for new users', status: 'in_progress', priority: 'medium', dueDate: '2024-02-22', startDate: '2024-02-15', assigneeId: peopleIds[2] }, // Carol
    { projectId: 2, title: 'Push notifications setup', description: 'Configure push notification service', status: 'todo', priority: 'medium', dueDate: '2024-02-25', startDate: null, assigneeId: null },

    // Project 3 tasks (API Integration)
    { projectId: 3, title: 'Stripe integration', description: 'Implement Stripe payment gateway', status: 'in_progress', priority: 'urgent', dueDate: '2024-02-12', startDate: '2024-02-08', assigneeId: peopleIds[3] }, // David
    { projectId: 3, title: 'SendGrid email setup', description: 'Configure transactional emails via SendGrid', status: 'todo', priority: 'high', dueDate: '2024-02-14', startDate: null, assigneeId: peopleIds[3] }, // David
    { projectId: 3, title: 'Twilio SMS integration', description: 'Add SMS notifications for critical alerts', status: 'backlog', priority: 'medium', dueDate: null, startDate: null, assigneeId: null },
    { projectId: 3, title: 'API documentation', description: 'Write comprehensive API documentation', status: 'review', priority: 'low', dueDate: '2024-02-28', startDate: '2024-02-20', assigneeId: peopleIds[0] } // Alice
  ];

  const taskIds = [];
  tasks.forEach(t => {
    const result = insertTask.run(
      t.projectId, 
      t.title, 
      t.description, 
      t.status, 
      t.priority, 
      t.dueDate, 
      t.startDate,
      t.assigneeId
    );
    taskIds.push(result.lastInsertRowid);
  });

  // Sample task_assignees (co-assignees/collaborators)
  const insertTaskAssignee = db.prepare(`
    INSERT INTO task_assignees (id, task_id, person_id, role) 
    VALUES (?, ?, ?, ?)
  `);

  const taskAssignees = [
    // Alice reviews and collaborates on various tasks
    { taskId: taskIds[0], personId: peopleIds[0], role: 'reviewer' }, // Alice reviews homepage mockup
    { taskId: taskIds[4], personId: peopleIds[0], role: 'collaborator' }, // Alice helps with React Native setup
    { taskId: taskIds[8], personId: peopleIds[2], role: 'collaborator' }, // Carol helps with Stripe integration
    // Eve (QA) tests several tasks
    { taskId: taskIds[1], personId: peopleIds[4], role: 'tester' }, // Eve tests navigation
    { taskId: taskIds[5], personId: peopleIds[4], role: 'tester' }, // Eve tests authentication
    { taskId: taskIds[10], personId: peopleIds[4], role: 'tester' }, // Eve will test SendGrid
  ];

  taskAssignees.forEach(ta => {
    insertTaskAssignee.run(crypto.randomUUID(), ta.taskId, ta.personId, ta.role);
  });

  // Sample task_tags
  const insertTaskTag = db.prepare(`
    INSERT INTO task_tags (id, task_id, tag_id) 
    VALUES (?, ?, ?)
  `);

  const taskTags = [
    // Project 1 tasks
    { taskId: taskIds[0], tagId: tagIds[3] }, // Design homepage -> UI/UX
    { taskId: taskIds[0], tagId: tagIds[1] }, // Design homepage -> Feature
    { taskId: taskIds[1], tagId: tagIds[1] }, // Navigation -> Feature
    { taskId: taskIds[1], tagId: tagIds[3] }, // Navigation -> UI/UX
    { taskId: taskIds[2], tagId: tagIds[1] }, // Contact form -> Feature
    { taskId: taskIds[3], tagId: tagIds[2] }, // Optimize images -> Enhancement
    
    // Project 2 tasks
    { taskId: taskIds[4], tagId: tagIds[1] }, // React Native setup -> Feature
    { taskId: taskIds[5], tagId: tagIds[1] }, // Authentication -> Feature
    { taskId: taskIds[5], tagId: tagIds[5] }, // Authentication -> Security
    { taskId: taskIds[6], tagId: tagIds[3] }, // Onboarding -> UI/UX
    { taskId: taskIds[7], tagId: tagIds[1] }, // Push notifications -> Feature
    { taskId: taskIds[7], tagId: tagIds[4] }, // Push notifications -> Performance
    
    // Project 3 tasks
    { taskId: taskIds[8], tagId: tagIds[1] }, // Stripe -> Feature
    { taskId: taskIds[8], tagId: tagIds[5] }, // Stripe -> Security
    { taskId: taskIds[9], tagId: tagIds[1] }, // SendGrid -> Feature
    { taskId: taskIds[10], tagId: tagIds[2] }, // Twilio -> Enhancement
    { taskId: taskIds[11], tagId: tagIds[2] }, // Documentation -> Enhancement
  ];

  taskTags.forEach(tt => {
    insertTaskTag.run(crypto.randomUUID(), tt.taskId, tt.tagId);
  });

  console.log('Database seeded successfully with sample data');
  console.log(`- ${projects.length} projects`);
  console.log(`- ${people.length} people`);
  console.log(`- ${tags.length} tags (${tags.filter(t => t.projectId === null).length} global, ${tags.filter(t => t.projectId !== null).length} project-specific)`);
  console.log(`- ${tasks.length} tasks`);
  console.log(`- ${taskAssignees.length} task assignments`);
  console.log(`- ${taskTags.length} task-tag associations`);
}

module.exports = { seedDatabase };
