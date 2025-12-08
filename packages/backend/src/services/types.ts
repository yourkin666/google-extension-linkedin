import type { FastifyBaseLogger } from 'fastify';

export interface LinkedInService {
  getUserURN(username: string, logger: FastifyBaseLogger): Promise<any>;
  getSimilarProfiles(urn: string, logger: FastifyBaseLogger): Promise<any>;
}

