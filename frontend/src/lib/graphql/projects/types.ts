import { Developer } from "../developers/types";

export interface Project {
    id: string;
    name: string;
    area?: string;
    developer: Developer;
  }

  