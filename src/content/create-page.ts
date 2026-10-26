import type { JevailabLocale } from '@/content/jevailab-homepage';

type CreatePageContent = {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    eyebrow: string;
    h1: string;
    description: string;
    workspaceLabel: string;
  };
  workflow: {
    title: string;
    description: string;
    steps: readonly {
      title: string;
      description: string;
    }[];
  };
  ratios: {
    title: string;
    description: string;
    items: readonly {
      ratio: '3:4' | '9:16' | '1:1' | '4:3' | '16:9';
      label: string;
      description: string;
    }[];
  };
  credits: {
    title: string;
    description: string;
    paragraphs: readonly string[];
  };
  safety: {
    title: string;
    description: string;
    points: readonly string[];
  };
  download: {
    title: string;
    description: string;
  };
};

const en: CreatePageContent = {
  meta: {
    title: 'AI Image Creator — Free Online, No Login',
    description:
      'Use the jevailab image workspace to choose a template, describe your idea, choose a ratio, review the server credit quote, and create a still image.',
  },
  hero: {
    eyebrow: 'jevailab image workspace',
    h1: 'Create an image from a photo or a prompt',
    description:
      'This is the working image tool. Choose a published template or free creation, write the visual direction, select a supported ratio, and review the server quote before you submit.',
    workspaceLabel: 'Create an image',
  },
  workflow: {
    title: 'How the image workspace works',
    description:
      'The workspace keeps the full creative flow on this page. The homepage introduces the product; this page is where you prepare and submit an image request.',
    steps: [
      {
        title: 'Choose a published template',
        description:
          'Browse the available styles or choose Free creation. A template supplies a starting visual direction, while your own description adds the subject, setting, light, color, and mood. Template covers are examples of the published style and are not public user uploads.',
      },
      {
        title: 'Describe the image',
        description:
          'Use a short, specific prompt. State the main subject and action first, then add the environment, time of day, lighting, palette, camera feeling, and composition. Avoid contradictory instructions. The field accepts up to 1,000 characters, so focus on details that materially change the image.',
      },
      {
        title: 'Choose an output ratio',
        description:
          'Pick the shape that fits the intended placement. The active ratio is visible before submission. Changing the ratio or other generation settings causes the workspace to request a fresh server quote, so the displayed total always belongs to the current draft.',
      },
      {
        title: 'Review the server credit quote',
        description:
          'Signed-in users see a server-calculated quote for the current draft. The quote identifies the per-image cost, output count, and total credits. The amount shown at submission is the source of truth; the browser does not decide the charge. If a generation fails, the published billing rules and the account record determine whether a hold is released.',
      },
      {
        title: 'Generate and download',
        description:
          'After confirming that you have the right to use the submitted text, start the generation. Progress and the final preview appear in the workspace. A completed image can be opened or downloaded from the preview. Private results are shown only after the applicable content checks complete.',
      },
    ],
  },
  ratios: {
    title: 'Supported image ratios',
    description:
      'The workspace exposes five primary output choices. The ratio changes composition and framing, not the visual subject you describe.',
    items: [
      {
        ratio: '3:4',
        label: 'Portrait',
        description:
          'A vertical format for portraits, posters, and mobile-first visual stories.',
      },
      {
        ratio: '9:16',
        label: 'Tall portrait',
        description:
          'A tall frame for full-screen stories, cover art, and vertical placements.',
      },
      {
        ratio: '1:1',
        label: 'Square',
        description:
          'A balanced square for profile visuals, product studies, and grid layouts.',
      },
      {
        ratio: '4:3',
        label: 'Classic landscape',
        description:
          'A familiar landscape frame for scenes, interiors, and editorial imagery.',
      },
      {
        ratio: '16:9',
        label: 'Wide landscape',
        description:
          'A wide frame for banners, presentation covers, and cinematic scenes.',
      },
    ],
  },
  credits: {
    title: 'How image credits are calculated',
    description:
      'Credits are the unit used for image generation. The price depends on the selected resolution mode and output count, and the server returns the authoritative quote for each current draft.',
    paragraphs: [
      'The workspace currently supports a 1K standard mode and a 2K high-definition mode. A 1K image costs 2 credits and a 2K image costs 5 credits in the active price schedule. The total is the per-image price multiplied by the selected output count. The final number displayed by the server quote is the amount to rely on because pricing configuration and generation settings can change.',
      'A quote is tied to the current template, ratio, output count, and prompt. If you change a material setting, the previous quote no longer describes the new request. Signed-out visitors can prepare a draft, but signing in is required before the server can quote or start a private generation. The draft is kept locally so the selected settings can be restored after authentication.',
    ],
  },
  safety: {
    title: 'Content safety and responsible use',
    description:
      'The image workflow includes content-safety review. Submitting a draft confirms that you have the right to use the content you provide.',
    points: [
      'Do not submit prompts or source content that violate another person’s rights, privacy, or applicable law.',
      'Prompts and generated results may be processed by automated review and, where needed, human-assisted review.',
      'Content that fails the safety rules may be blocked, withheld, or prevented from appearing in the private preview.',
      'Keep personal or confidential information out of prompts unless you have a lawful reason and the right to use it.',
    ],
  },
  download: {
    title: 'Preview, privacy, and download',
    description:
      'The workspace shows the generation state and only exposes results that pass the required checks. When a result is ready, use the download control in the preview panel. The output is intended as a still image, and the page does not expose any other media-generation control.',
  },
};

const zh: CreatePageContent = {
  meta: {
    title: 'AI 图片创作工具',
    description:
      '使用 jevailab 图片工作台选择模板、描述画面、设置比例、确认服务端积分报价，并生成与下载静态图片。',
  },
  hero: {
    eyebrow: 'jevailab 图片工作台',
    h1: 'AI 图片创作工具',
    description:
      '这里是可直接操作的图片工具。选择已发布模板或自由创作，写下画面要求，设置支持的图片比例，并在提交前确认服务端积分报价。',
    workspaceLabel: '开始创作图片',
  },
  workflow: {
    title: '图片工作台的完整流程',
    description:
      '完整的创作流程集中在本页。首页负责介绍产品；这里负责准备参数、确认报价并提交图片生成请求。',
    steps: [
      {
        title: '选择已发布模板',
        description:
          '浏览可用风格，或选择“自由创作”。模板提供起始视觉方向，文字描述用于补充主体、场景、光线、颜色与氛围。模板封面是已发布风格的示例，不是其他用户的公开上传作品。',
      },
      {
        title: '描述目标画面',
        description:
          '先写清主要主体与动作，再补充环境、时间、光线、色调、镜头感和构图。避免互相冲突的要求。输入框最多接受 1,000 个字符，应优先写真正影响画面的信息。',
      },
      {
        title: '选择输出比例',
        description:
          '按图片最终用途选择画幅，提交前会显示当前比例。比例或其他生成参数改变后，工作台会重新获取服务端报价，确保展示的总积分始终对应当前草稿。',
      },
      {
        title: '确认服务端积分报价',
        description:
          '登录用户会看到当前草稿的服务端积分报价，其中包括单张消耗、生成数量和总积分。提交时显示的服务端报价是实际扣费依据，浏览器不会自行决定价格。若生成失败，公开计费规则与账户记录决定预扣积分是否释放。',
      },
      {
        title: '生成并下载',
        description:
          '确认拥有所提交文字的使用权后即可开始生成。进度与最终预览会显示在工作台中；完成后可从预览区打开或下载图片。只有完成适用内容检查的私有结果才会展示。',
      },
    ],
  },
  ratios: {
    title: '支持的图片比例',
    description:
      '工作台提供五种主要输出比例。比例影响构图与取景范围，不改变你描述的主体内容。',
    items: [
      {
        ratio: '3:4',
        label: '竖版',
        description: '适合人物肖像、海报和移动端视觉故事的竖向画幅。',
      },
      {
        ratio: '9:16',
        label: '长竖版',
        description: '适合全屏故事、封面和竖向展示位置的高长画幅。',
      },
      {
        ratio: '1:1',
        label: '方形',
        description: '适合头像、产品视觉和网格排版的均衡方形画幅。',
      },
      {
        ratio: '4:3',
        label: '经典横版',
        description: '适合场景、室内和编辑图片的常见横向画幅。',
      },
      {
        ratio: '16:9',
        label: '宽幅横版',
        description: '适合横幅、演示封面和电影感场景的宽画幅。',
      },
    ],
  },
  credits: {
    title: '图片积分如何计算',
    description:
      '积分是图片生成使用的额度。价格取决于所选分辨率模式与生成数量，服务端会为每份当前草稿返回权威报价。',
    paragraphs: [
      '工作台当前提供 1K 标准模式与 2K 高清模式。在现行价格规则中，1K 图片每张消耗 2 积分，2K 图片每张消耗 5 积分；总积分为单张价格乘以生成数量。最终应以服务端报价显示的数字为准，因为价格配置与生成参数可能调整。',
      '报价与当前模板、比例、生成数量和文字描述绑定。改变实质参数后，旧报价不再对应当前请求。访客可以先在本地准备草稿，但获取服务端报价并开始私有生成前需要登录；草稿会保存在本地，便于登录后恢复所选参数。',
    ],
  },
  safety: {
    title: '内容安全与使用责任',
    description:
      '图片流程包含内容安全检查。提交草稿即表示你确认拥有所提供内容的使用权。',
    points: [
      '不得提交侵犯他人权利、隐私或违反适用法律的描述与素材。',
      '文字描述与生成结果可能经过自动审核，并在需要时经过人工辅助审核。',
      '不符合安全规则的内容可能被阻止、暂不返回，或无法出现在私有预览中。',
      '除非拥有合法理由与使用权，请勿在描述中填写个人或机密信息。',
    ],
  },
  download: {
    title: '预览、隐私与下载',
    description:
      '工作台显示生成状态，并且只展示完成必要检查的结果。图片就绪后，可在预览区使用下载控件。输出用途为静态图片，本页不提供其他媒介的生成控件。',
  },
};

const content: Record<JevailabLocale, CreatePageContent> = { en, zh };

export function getCreatePageContent(
  locale: JevailabLocale
): CreatePageContent {
  return content[locale];
}

export function getCreatePageWordCount(locale: JevailabLocale): number {
  const value = content[locale];
  const text = [
    value.hero.description,
    value.workflow.description,
    ...value.workflow.steps.flatMap((step) => [step.title, step.description]),
    value.ratios.description,
    ...value.ratios.items.flatMap((item) => [item.label, item.description]),
    value.credits.description,
    ...value.credits.paragraphs,
    value.safety.description,
    ...value.safety.points,
    value.download.description,
  ].join(' ');

  if (locale === 'zh') {
    return Array.from(text.replace(/\s/g, '')).length;
  }
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type { CreatePageContent };
