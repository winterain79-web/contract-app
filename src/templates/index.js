// 계약서 템플릿 레지스트리.
// F-6 외 다른 체류자격용 계약서를 추가할 때는 같은 모양의 객체를 만들어 여기에 등록한다.
import F6Form from './f6/F6Form.jsx';
import F6Pages from './f6/F6Pages.jsx';
import { emptyData, normalize, validate } from './f6/model.js';

export const TEMPLATES = {
  f6: {
    id: 'f6',
    name: '결혼이민(F-6) 대행계약서',
    Form: F6Form,
    Pages: F6Pages,
    pageCount: 2,
    emptyData,
    normalize,
    validate,
    fileBase: (d) => `대행계약서_${d.nationality.trim()}_${d.clientName.trim()}`,
    summary: (d) => ({ clientName: d.clientName.trim(), nationality: d.nationality.trim(), contractDate: d.contractDate }),
  },
};

export const DEFAULT_TEMPLATE = 'f6';
