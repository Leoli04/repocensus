import type { CategoryTemplate } from './types'

// ============================================================
// Preset Category Templates
// ============================================================

export const PRESET_TEMPLATES: CategoryTemplate[] = [
  // ── 1. By Technology Domain ─────────────────────────────
  {
    id: 'by-domain',
    name: '按技术领域',
    description: '根据仓库主题、语言和关键词推断技术领域',
    type: 'preset',
    categories: [
      {
        name: 'AI/ML',
        priority: 1,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['ai', 'ml', 'llm', 'agent', 'rag', 'gpt', 'chatgpt', 'langchain', 'openai', 'machine-learning', 'deep-learning', 'nlp'], weight: 10 },
          { field: 'language', operator: 'equals', value: ['jupyter-notebook', 'python'], weight: 4 },
          { field: 'name', operator: 'contains', value: ['llm', 'gpt', 'agent', 'ai-', '-ai', 'rag', 'prompt'], weight: 3 },
          { field: 'description', operator: 'contains', value: ['llm', 'agent', 'machine learning', 'deep learning', 'neural', 'gpt', 'ai', 'rag'], weight: 2 },
        ],
      },
      {
        name: '后端',
        priority: 2,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['spring', 'springboot', 'fastapi', 'django', 'flask', 'api', 'server', 'backend', 'microservice', 'rest', 'graphql'], weight: 10 },
          { field: 'language', operator: 'equals', value: ['java', 'go', 'rust', 'kotlin'], weight: 5 },
          { field: 'name', operator: 'contains', value: ['api', 'server', 'backend', 'service', 'spring'], weight: 3 },
          { field: 'description', operator: 'contains', value: ['spring boot', 'fastapi', 'django', 'microservice', 'rest api', 'backend'], weight: 2 },
        ],
      },
      {
        name: '前端',
        priority: 3,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['vue', 'react', 'next', 'nuxt', 'frontend', 'ui', 'css', 'vite', 'webpack', 'tailwind'], weight: 10 },
          { field: 'language', operator: 'equals', value: ['vue', 'svelte', 'typescript', 'javascript'], weight: 5 },
          { field: 'name', operator: 'contains', value: ['vue', 'react', 'next', 'admin', 'frontend', 'ui-', 'dashboard'], weight: 3 },
          { field: 'description', operator: 'contains', value: ['vue', 'react', 'frontend', 'ui component', 'dashboard'], weight: 2 },
        ],
      },
      {
        name: 'DevOps/基础设施',
        priority: 4,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['docker', 'kubernetes', 'k8s', 'ci', 'cd', 'deploy', 'terraform', 'devops', 'nginx', 'linux'], weight: 10 },
          { field: 'name', operator: 'contains', value: ['docker', 'k8s', 'deploy', 'ci-', 'cd-'], weight: 3 },
          { field: 'description', operator: 'contains', value: ['docker', 'kubernetes', 'ci/cd', 'deployment', 'infrastructure'], weight: 2 },
        ],
      },
      {
        name: '数据工程',
        priority: 5,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['data', 'etl', 'pipeline', 'visualization', 'dataset', 'analytics', 'spark', 'flink'], weight: 10 },
          { field: 'name', operator: 'contains', value: ['data', 'etl', 'pipeline'], weight: 3 },
          { field: 'description', operator: 'contains', value: ['data engineering', 'etl', 'data pipeline', 'analytics'], weight: 2 },
        ],
      },
      {
        name: '安全/网络',
        priority: 6,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['security', 'crypto', 'auth', 'proxy', 'vpn', 'network', 'penetration'], weight: 10 },
          { field: 'name', operator: 'contains', value: ['proxy', 'vpn', 'clash', 'v2ray', 'security', 'auth'], weight: 3 },
          { field: 'description', operator: 'contains', value: ['proxy', 'vpn', 'security', 'encryption', 'authentication'], weight: 2 },
        ],
      },
      {
        name: '机器人/硬件',
        priority: 7,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['robot', 'robotics', 'hardware', 'embedded', 'ros', 'iot', 'arduino', 'raspberry-pi'], weight: 10 },
          { field: 'name', operator: 'contains', value: ['robot', 'agibot', 'hardware', 'embedded'], weight: 3 },
          { field: 'description', operator: 'contains', value: ['robot', 'hardware', 'embedded', 'ros'], weight: 2 },
        ],
      },
      {
        name: '工具/效率',
        priority: 8,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['cli', 'tool', 'utility', 'automation', 'extension', 'plugin', 'workflow'], weight: 8 },
          { field: 'name', operator: 'contains', value: ['tool', 'cli', 'util', 'helper', 'extension'], weight: 3 },
          { field: 'description', operator: 'contains', value: ['cli tool', 'utility', 'automation', 'browser extension'], weight: 2 },
        ],
      },
      {
        name: '学习/资源',
        priority: 9,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['tutorial', 'book', 'course', 'notes', 'examples', 'learning', 'education', 'interview', 'algorithm'], weight: 8 },
          { field: 'name', operator: 'contains', value: ['learning', 'note', 'book', 'tutorial', 'algo', 'interview', 'example'], weight: 3 },
          { field: 'description', operator: 'contains', value: ['tutorial', 'learning', '笔记', '学习', '面试', '算法'], weight: 2 },
        ],
      },
      {
        name: '模板/脚手架',
        priority: 10,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['template', 'boilerplate', 'starter', 'scaffold'], weight: 10 },
          { field: 'name', operator: 'contains', value: ['template', 'starter', 'scaffold', 'boilerplate'], weight: 5 },
          { field: 'description', operator: 'contains', value: ['template', 'boilerplate', 'starter kit', 'scaffold'], weight: 3 },
        ],
      },
      {
        name: '个人/配置',
        priority: 11,
        matchers: [
          { field: 'name', operator: 'contains', value: ['profile', '.github.io', 'dotfiles', 'config'], weight: 8 },
          { field: 'topics', operator: 'contains', value: ['profile', 'dotfiles', 'personal'], weight: 6 },
        ],
      },
    ],
  },

  // ── 2. By Language ──────────────────────────────────────
  {
    id: 'by-language',
    name: '按编程语言',
    description: '按仓库主语言分类',
    type: 'preset',
    categories: [
      { name: 'Java', priority: 1, matchers: [{ field: 'language', operator: 'equals', value: 'java', weight: 10 }] },
      { name: 'Python', priority: 2, matchers: [{ field: 'language', operator: 'equals', value: ['python', 'jupyter-notebook'], weight: 10 }] },
      { name: 'JavaScript', priority: 3, matchers: [{ field: 'language', operator: 'equals', value: 'javascript', weight: 10 }] },
      { name: 'TypeScript', priority: 4, matchers: [{ field: 'language', operator: 'equals', value: 'typescript', weight: 10 }] },
      { name: 'Vue', priority: 5, matchers: [{ field: 'language', operator: 'equals', value: 'vue', weight: 10 }] },
      { name: 'Go', priority: 6, matchers: [{ field: 'language', operator: 'equals', value: 'go', weight: 10 }] },
      { name: 'Rust', priority: 7, matchers: [{ field: 'language', operator: 'equals', value: 'rust', weight: 10 }] },
      { name: 'C/C++', priority: 8, matchers: [{ field: 'language', operator: 'equals', value: ['c', 'c++'], weight: 10 }] },
      { name: 'HTML/CSS', priority: 9, matchers: [{ field: 'language', operator: 'equals', value: ['html', 'css'], weight: 10 }] },
      { name: '其他', priority: 99, matchers: [{ field: 'language', operator: 'equals', value: '*', weight: 1 }] },
    ],
  },

  // ── 3. By Activity ──────────────────────────────────────
  {
    id: 'by-activity',
    name: '按活跃度',
    description: '按最后更新时间分类，帮助发现沉默仓库',
    type: 'preset',
    categories: [
      { name: '🟢 活跃 (< 6个月)', priority: 1, matchers: [{ field: 'name', operator: 'regex', value: '__ACTIVE_6M__', weight: 10 }] },
      { name: '🟡 沉默 (6月-2年)', priority: 2, matchers: [{ field: 'name', operator: 'regex', value: '__SILENT_2Y__', weight: 8 }] },
      { name: '🔴 归档 (> 2年)', priority: 3, matchers: [{ field: 'name', operator: 'regex', value: '__ARCHIVED_2Y__', weight: 5 }] },
    ],
  },

  // ── 4. By Purpose ───────────────────────────────────────
  {
    id: 'by-purpose',
    name: '按用途',
    description: '按仓库角色分类：模板、学习、应用、配置',
    type: 'preset',
    categories: [
      {
        name: '模板/脚手架',
        priority: 1,
        matchers: [
          { field: 'name', operator: 'contains', value: ['template', 'starter', 'scaffold', 'boilerplate'], weight: 8 },
          { field: 'topics', operator: 'contains', value: ['template', 'boilerplate', 'starter'], weight: 6 },
        ],
      },
      {
        name: '学习/笔记',
        priority: 2,
        matchers: [
          { field: 'name', operator: 'contains', value: ['learning', 'note', 'book', 'tutorial', 'example', 'notebook'], weight: 5 },
          { field: 'topics', operator: 'contains', value: ['tutorial', 'learning', 'examples', 'notes'], weight: 5 },
        ],
      },
      {
        name: '应用/工具',
        priority: 3,
        matchers: [
          { field: 'name', operator: 'contains', value: ['platform', 'tool', 'app', 'system', 'dashboard'], weight: 4 },
          { field: 'topics', operator: 'contains', value: ['app', 'tool', 'platform'], weight: 4 },
        ],
      },
      {
        name: '框架/库',
        priority: 4,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['framework', 'library', 'sdk'], weight: 6 },
          { field: 'name', operator: 'contains', value: ['framework', 'sdk', 'lib-'], weight: 4 },
        ],
      },
      {
        name: '个人主页/配置',
        priority: 5,
        matchers: [
          { field: 'name', operator: 'contains', value: ['profile', '.github.io', 'dotfiles', 'config', 'technology'], weight: 6 },
        ],
      },
      {
        name: 'Fork 参考',
        priority: 6,
        matchers: [
          { field: 'name', operator: 'regex', value: '__IS_FORK__', weight: 3 },
        ],
      },
    ],
  },

  // ── 5. By Type (deterministic) ──────────────────────────
  {
    id: 'by-type',
    name: '按来源',
    description: '自建 / Fork / Star 三类',
    type: 'preset',
    categories: [
      { name: '🛠️ 自建', priority: 1, matchers: [{ field: 'name', operator: 'regex', value: '__IS_ORIGINAL__', weight: 10 }] },
      { name: '🍴 Fork', priority: 2, matchers: [{ field: 'name', operator: 'regex', value: '__IS_FORK__', weight: 10 }] },
      { name: '⭐ Star', priority: 3, matchers: [{ field: 'name', operator: 'regex', value: '__IS_STAR__', weight: 10 }] },
    ],
  },

  // ── 6. By AI Domain (AI 专项细分) ───────────────────────
  // Design principle: specific keywords get high weight, generic keywords
  // get low weight, so each repo lands in its most specific sub-category.
  // Non-AI repos fall through to "其他" automatically (score 0).
  {
    id: 'by-ai-domain',
    name: 'AI 专项',
    description: 'AI 仓库细分类：Agent、Skill、MCP、Prompt、RAG、LLM、训练、ML、教程、生成式',
    type: 'preset',
    categories: [
      // 1. Agent 框架/平台 — 最高优先，多信号
      {
        name: '🤖 Agent 框架',
        priority: 1,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['ai-agent', 'ai-agents', 'multi-agent', 'autonomous-agent', 'agent-framework', 'agentic', 'agent-based', 'agent-platform', 'agent-collaboration', 'agent-harness', 'deepagents', 'agent-memory', 'react-agent'], weight: 12 },
          { field: 'topics', operator: 'contains', value: ['agent'], weight: 5 },
          { field: 'name', operator: 'contains', value: ['agent', 'crewai', 'autogpt', 'metagpt', 'openhands', 'swe-agent', 'owl', 'autonomous', 'joyagent', 'eigent', 'cowagent'], weight: 8 },
          { field: 'description', operator: 'contains', value: ['agent framework', 'multi-agent', 'autonomous agent', 'ai agent', 'coding agent', 'ai assistant', '智能体', '多智能体', '智能体框架'], weight: 6 },
          { field: 'description', operator: 'contains', value: ['agent'], weight: 3 },
        ],
      },
      // 2. Agent Skill / 技能 — 专有词极高权重
      {
        name: '🔧 Agent Skill',
        priority: 2,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['agent-skills', 'agent-skill', 'claude-skills', 'claude-skill', 'codex-skills', 'skills-management', 'openclaw-skills'], weight: 15 },
          { field: 'topics', operator: 'contains', value: ['skill'], weight: 8 },
          { field: 'name', operator: 'contains', value: ['skill', 'superpowers', 'baoyu', 'openskills', 'agentskills'], weight: 10 },
          { field: 'description', operator: 'contains', value: ['agent skill', 'skill for', '技能'], weight: 6 },
        ],
      },
      // 3. MCP / 工具协议 — 专有词极高权重
      {
        name: '🔗 MCP / 工具协议',
        priority: 3,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['mcp', 'mcp-server', 'mcp-client', 'model-context-protocol', 'modelcontextprotocol', 'function-calling', 'tool-use'], weight: 12 },
          { field: 'name', operator: 'contains', value: ['mcp'], weight: 10 },
          { field: 'description', operator: 'contains', value: ['model context protocol', 'mcp server', 'mcp client', 'function calling'], weight: 8 },
        ],
      },
      // 4. Prompt 工程
      {
        name: '💬 Prompt 工程',
        priority: 4,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['prompt-engineering', 'prompt-optimization', 'prompt-optimizer', 'system-prompt', 'system-prompts', 'prompt-testing', 'prompt-tuning', 'prompt-toolkit', 'ai-prompts', 'cursorrules'], weight: 12 },
          { field: 'topics', operator: 'contains', value: ['prompt', 'prompts'], weight: 8 },
          { field: 'name', operator: 'contains', value: ['prompt', 'cursorrules'], weight: 8 },
          { field: 'description', operator: 'contains', value: ['prompt engineering', 'prompt optimization', 'system prompt', '提示词'], weight: 6 },
        ],
      },
      // 5. RAG / 知识库
      // Note: 'rag' removed from topics matcher — it substring-matches 'storage'
      // (s-to-r-A-G-e). Use specific terms instead; 'rag' still works via name field.
      {
        name: '📚 RAG / 知识库',
        priority: 5,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['retrieval-augmented', 'retrieval-augmented-generation', 'vector-database', 'vector-search', 'vector-store', 'embedding', 'embeddings', 'knowledge-base', 'semantic-search', 'reranking', 'graphrag', 'agentic-rag'], weight: 12 },
          { field: 'name', operator: 'contains', value: ['rag', 'chatchat', 'weknora', 'milvus', 'lancedb', 'ragflow'], weight: 8 },
          { field: 'description', operator: 'contains', value: ['retrieval augmented', 'vector database', '知识库', '向量数据库'], weight: 6 },
        ],
      },
      // 6. LLM 框架/应用 — 通用词给中低权重
      {
        name: '🧠 LLM 框架/应用',
        priority: 6,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['langchain', 'langgraph', 'llamaindex', 'dify', 'coze', 'chatbot', 'chatglm'], weight: 10 },
          { field: 'topics', operator: 'contains', value: ['llm', 'llms', 'openai', 'chatgpt', 'ollama', 'llama', 'qwen', 'deepseek', 'gpt'], weight: 6 },
          { field: 'name', operator: 'contains', value: ['langchain', 'langgraph', 'dify', 'llama', 'chatgpt', 'open-webui', 'nextchat', 'chatbox', 'ollama', 'one-api', 'coze', 'lobehub', 'chatglm'], weight: 8 },
          { field: 'description', operator: 'contains', value: ['llm', 'large language model', '大模型', '大语言模型', '语言模型'], weight: 4 },
        ],
      },
      // 7. 模型训练/推理
      {
        name: '⚙️ 模型训练/推理',
        priority: 7,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['fine-tuning', 'fine-tune', 'lora', 'quantization', 'llm-serving', 'inference', 'pretraining', 'reinforcement-learning'], weight: 10 },
          { field: 'name', operator: 'contains', value: ['unsloth', 'mingpt', 'minimind', 'tensorrt', 'mooncake'], weight: 8 },
          { field: 'description', operator: 'contains', value: ['fine-tuning', 'inference', 'llm serving', '微调', '训练', '推理加速'], weight: 6 },
        ],
      },
      // 8. ML / 深度学习 — 传统机器学习
      {
        name: '📊 ML / 深度学习',
        priority: 8,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['machine-learning', 'deep-learning', 'neural-network', 'neural-networks', 'pytorch', 'tensorflow', 'scikit-learn', 'sklearn', 'transformers', 'transformer', 'nlp', 'computer-vision', 'data-science', 'mlops'], weight: 10 },
          { field: 'name', operator: 'contains', value: ['pytorch', 'tensorflow', 'imgaug', 'jax', 'paddleocr'], weight: 8 },
          { field: 'description', operator: 'contains', value: ['machine learning', 'deep learning', 'neural network', '机器学习', '深度学习', '神经网络'], weight: 5 },
        ],
      },
      // 9. AI 学习/资源 — 教程、书籍、课程（与 AI 信号互补）
      {
        name: '📖 AI 学习/资源',
        priority: 9,
        matchers: [
          { field: 'name', operator: 'contains', value: ['tutorial', 'guide', 'book', 'beginner', 'course', 'notebook', 'notebooks', 'learning', 'examples', 'cookbook', 'awesome', 'roadmap', 'from-scratch', 'dive-into', 'for-beginners', 'howto', '101'], weight: 6 },
          { field: 'description', operator: 'contains', value: ['tutorial', 'course', 'guide', '笔记', '教程', '从零', '入门', '学习指南', '食用指南', 'roadmap', 'book'], weight: 5 },
        ],
      },
      // 10. 生成式 AI / 多模态
      {
        name: '🎨 生成式 AI',
        priority: 10,
        matchers: [
          { field: 'topics', operator: 'contains', value: ['stable-diffusion', 'image-generation', 'diffusion', 'text-to-speech', 'tts', 'audio-generation', 'voice-cloning', 'voice-clone', 'text2image', 'img2img', 'comfyui', 'ai-art', 'music-generation', 'style-transfer'], weight: 12 },
          { field: 'name', operator: 'contains', value: ['comfyui', 'stable-diffusion', 'suno'], weight: 8 },
          { field: 'description', operator: 'contains', value: ['image generation', 'diffusion model', 'voice clone', 'text to speech', '图像生成', '语音合成', '音乐生成'], weight: 6 },
        ],
      },
    ],
  },
]

export function getTemplate(id: string): CategoryTemplate | undefined {
  return PRESET_TEMPLATES.find((t) => t.id === id)
}
