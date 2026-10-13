/* 画風（任意・既定は指定しない）。美形タイプとは混ぜず、通常の抽選対象にもしない。 */
import type { Option } from '../types';
import { o } from './helpers';

export const ART_STYLE: Option[] = [
  o('none', '指定しない', [], { desc: 'モデルやLoRAの画風に任せます。' }),
  o('anime', 'アニメ調', 'anime style', { nat: 'in a clean anime style' }),
  o('illustration', 'イラスト調', 'illustration', { nat: 'as a detailed illustration' }),
  o('cel', 'セル塗り', 'cel shading', { nat: 'with crisp cel shading' }),
  o('painterly', '厚塗り', 'painterly, thick painting', { nat: 'in a painterly style with rich brushwork' }),
  o('watercolor', '水彩風', 'watercolor (medium)', { nat: 'in a delicate watercolor style' }),
  o('semi_real', '写実寄り', 'semi-realistic', { nat: 'in a semi-realistic style' }),
  o('ukiyoe', '浮世絵風', 'ukiyo-e', { nat: 'in the style of an ukiyo-e woodblock print' }),
  o('art_nouveau', 'アール・ヌーヴォー風', 'art nouveau', { nat: 'with Art Nouveau ornamental framing' })
];
