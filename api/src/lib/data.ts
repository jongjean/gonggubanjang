// api/lib/data.ts
// Vercel KV나 다른 DB 없이 메모리 기반 데이터 관리

export type Tool = {
  id: string;
  name: string;
  category: string;
  manufacturer?: string;
  model?: string;
  condition?: "new" | "used" | string;
  purchaseDate?: string;
  lifespanMonths?: number;
  available?: boolean;
  loanStatus?: string;
  damaged?: boolean;
  repaired?: boolean;
  imageUrl?: string;
  notes?: string;
  createdAt?: string;
  requiredKeys?: string[];
  hiddenKeys?: string[];
};

export type Loan = {
  id: string;
  toolId: string;
  borrowerName: string;
  borrowDate: string;
  returnDate?: string;
  status: "borrowed" | "returned";
};

export type Incident = {
  id: string;
  toolId: string;
  type: "new" | "repair" | "damage" | "lost";
  description: string;
  timestamp: string;
};

// 메모리 기반 데이터 저장소
let tools: Record<string, Tool> = {};
let loans: Loan[] = [];
let incidents: Incident[] = [];

// 초기 샘플 데이터
const initializeData = () => {
  if (Object.keys(tools).length > 0) return; // 이미 초기화됨

  tools = {
    "G001": {
      id: "G001",
      name: "드릴 드라이버",
      category: "전동공구",
      manufacturer: "DeWalt",
      model: "XR-18V",
      condition: "used",
      purchaseDate: "2023-01-15",
      lifespanMonths: 36,
      available: true,
      loanStatus: "반납",
      damaged: false,
      repaired: false,
      imageUrl: "drilldriver.jpg",
      notes: "배터리 2개 포함",
      createdAt: "2023-01-15T00:00:00.000Z",
      requiredKeys: ["name", "condition"],
      hiddenKeys: []
    },
    "G002": {
      id: "G002",
      name: "원형톱",
      category: "전동공구",
      manufacturer: "Makita",
      model: "5007MG",
      condition: "new",
      purchaseDate: "2023-03-10",
      lifespanMonths: 48,
      available: true,
      loanStatus: "반납",
      damaged: false,
      repaired: false,
      imageUrl: "circularsaw.jpg",
      notes: "날 교체 필요시 연락",
      createdAt: "2023-03-10T00:00:00.000Z",
      requiredKeys: ["name", "condition"],
      hiddenKeys: []
    },
    "G003": {
      id: "G003",
      name: "해머",
      category: "수공구",
      manufacturer: "Stanley",
      model: "STHT51512",
      condition: "used",
      purchaseDate: "2022-08-20",
      lifespanMonths: 60,
      available: false,
      loanStatus: "대출중",
      damaged: false,
      repaired: false,
      imageUrl: "hammer.jpg",
      notes: "무게 450g",
      createdAt: "2022-08-20T00:00:00.000Z",
      requiredKeys: ["name", "condition"],
      hiddenKeys: []
    },
    "G004": {
      id: "G004",
      name: "각도절단기",
      category: "전동공구",
      manufacturer: "BOSCH",
      model: "GWS 7-115",
      condition: "used",
      purchaseDate: "2023-02-20",
      lifespanMonths: 36,
      available: true,
      loanStatus: "반납",
      damaged: false,
      repaired: false,
      imageUrl: "anglegrinder.jpg",
      notes: "보안경 착용 필수",
      createdAt: "2023-02-20T00:00:00.000Z",
      requiredKeys: ["name", "condition"],
      hiddenKeys: []
    },
    "G005": {
      id: "G005",
      name: "줄자",
      category: "수공구",
      manufacturer: "Stanley",
      model: "STHT30825",
      condition: "new",
      purchaseDate: "2023-04-05",
      lifespanMonths: 24,
      available: true,
      loanStatus: "반납",
      damaged: false,
      repaired: false,
      imageUrl: "tape-measure.jpg",
      notes: "5m 길이",
      createdAt: "2023-04-05T00:00:00.000Z",
      requiredKeys: ["name", "condition"],
      hiddenKeys: []
    }
  };

  loans = [
    {
      id: "L001",
      toolId: "G003",
      borrowerName: "김철수",
      borrowDate: "2023-11-01",
      status: "borrowed"
    }
  ];

  incidents = [
    {
      id: "I001",
      toolId: "G001",
      type: "new",
      description: "새 공구 등록: 드릴 드라이버",
      timestamp: "2023-01-15T00:00:00.000Z"
    }
  ];
};

export const getTools = (): Tool[] => {
  initializeData();
  return Object.values(tools);
};

export const getTool = (id: string): Tool | undefined => {
  initializeData();
  return tools[id];
};

export const createTool = (toolData: Partial<Tool>): Tool => {
  initializeData();
  const id = "G" + String(Date.now()).slice(-6);
  const tool: Tool = {
    id,
    name: toolData.name || "새 공구",
    category: toolData.category || "기타",
    condition: toolData.condition || "used",
    available: true,
    loanStatus: "반납",
    damaged: false,
    repaired: false,
    createdAt: new Date().toISOString(),
    requiredKeys: ["name", "condition"],
    hiddenKeys: [],
    ...toolData
  };
  tools[id] = tool;
  
  // 새 공구 등록 사건 추가
  incidents.push({
    id: "I" + Date.now(),
    toolId: id,
    type: "new",
    description: `새 공구 등록: ${tool.name}`,
    timestamp: new Date().toISOString()
  });
  
  return tool;
};

export const updateTool = (id: string, updates: Partial<Tool>): Tool | undefined => {
  initializeData();
  if (!tools[id]) return undefined;
  
  tools[id] = { ...tools[id], ...updates };
  return tools[id];
};

export const deleteTool = (id: string): boolean => {
  initializeData();
  if (!tools[id]) return false;
  
  delete tools[id];
  return true;
};

export const getLoans = (): Loan[] => {
  initializeData();
  return loans;
};

export const createLoan = (loanData: Omit<Loan, "id">): Loan => {
  initializeData();
  const loan: Loan = {
    id: "L" + Date.now(),
    ...loanData
  };
  loans.push(loan);
  
  // 공구 상태 업데이트
  if (tools[loan.toolId]) {
    tools[loan.toolId].available = false;
    tools[loan.toolId].loanStatus = "대출중";
  }
  
  return loan;
};

export const returnLoan = (loanId: string): boolean => {
  initializeData();
  const loan = loans.find(l => l.id === loanId);
  if (!loan) return false;
  
  loan.status = "returned";
  loan.returnDate = new Date().toISOString();
  
  // 공구 상태 업데이트
  if (tools[loan.toolId]) {
    tools[loan.toolId].available = true;
    tools[loan.toolId].loanStatus = "반납";
  }
  
  return true;
};

export const getIncidents = (): Incident[] => {
  initializeData();
  return incidents;
};

export const createIncident = (incidentData: Omit<Incident, "id" | "timestamp">): Incident => {
  initializeData();
  const incident: Incident = {
    id: "I" + Date.now(),
    timestamp: new Date().toISOString(),
    ...incidentData
  };
  incidents.push(incident);
  return incident;
};