import { Injectable, Logger } from '@nestjs/common';
import { BaseRoleAgent } from '../interfaces/role-agent.interface';
import { SysRoleAgent } from '../agents/sys-role.agent';
import { VenRoleAgent } from '../agents/ven-role.agent';
// Importar otros agentes cuando se creen
// import { AdmRoleAgent } from '../agents/adm-role.agent';
// import { JveRoleAgent } from '../agents/jve-role.agent';
// import { RecRoleAgent } from '../agents/rec-role.agent';
// import { CobRoleAgent } from '../agents/cob-role.agent';

@Injectable()
export class RoleAgentFactory {
  private readonly logger = new Logger(RoleAgentFactory.name);
  private readonly agents = new Map<string, BaseRoleAgent>();

  constructor(
    private readonly sysAgent: SysRoleAgent,
    private readonly venAgent: VenRoleAgent,
    // Inyectar otros agentes cuando se creen
    // private readonly admAgent: AdmRoleAgent,
    // private readonly jveAgent: JveRoleAgent,
    // private readonly recAgent: RecRoleAgent,
    // private readonly cobAgent: CobRoleAgent,
  ) {
    this.initializeAgents();
  }

  private initializeAgents(): void {
    // Registrar todos los agentes disponibles
    this.agents.set('SYS', this.sysAgent);
    this.agents.set('VEN', this.venAgent);

    // Registrar otros agentes cuando se implementen
    // this.agents.set('ADM', this.admAgent);
    // this.agents.set('JVE', this.jveAgent);
    // this.agents.set('REC', this.recAgent);
    // this.agents.set('COB', this.cobAgent);

    this.logger.log(
      `🤖 Initialized ${this.agents.size} role agents: ${Array.from(this.agents.keys()).join(', ')}`,
    );
  }

  getAgentForRole(roleCode: string): BaseRoleAgent {
    const agent = this.agents.get(roleCode);

    if (!agent) {
      this.logger.warn(
        `⚠️ No specific agent found for role: ${roleCode}, using SYS agent as fallback`,
      );
      return this.agents.get('SYS')!; // Usar SYS como fallback
    }

    this.logger.debug(
      `🎯 Using ${roleCode} agent for role-specific processing`,
    );
    return agent;
  }

  getAvailableRoles(): string[] {
    return Array.from(this.agents.keys());
  }

  hasAgentForRole(roleCode: string): boolean {
    return this.agents.has(roleCode);
  }

  getAgentCapabilities(roleCode: string): string[] {
    const agent = this.agents.get(roleCode);
    return agent ? (agent as any).capabilities || [] : [];
  }

  // Método para agregar nuevos agentes dinámicamente si es necesario
  registerAgent(roleCode: string, agent: BaseRoleAgent): void {
    this.agents.set(roleCode, agent);
    this.logger.log(`✅ Registered new agent for role: ${roleCode}`);
  }

  // Método para verificar que los agentes tengan acceso al contexto
  validateAgentsContext(): {
    role: string;
    hasContext: boolean;
    capabilities: number;
  }[] {
    const results = [];

    for (const [role, agent] of this.agents.entries()) {
      const capabilities = (agent as any).capabilities || [];
      const hasContext = capabilities.length > 0;

      results.push({
        role,
        hasContext,
        capabilities: capabilities.length,
      });
    }

    return results;
  }
}
