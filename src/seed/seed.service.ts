import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { LeadSource } from 'src/lead/entities/lead-source.entity';
import { DocumentType } from 'src/lead/entities/lead.entity';
import { Liner } from 'src/lead/entities/liner.entity';
import { Ubigeo } from 'src/lead/entities/ubigeo.entity';
import { Role } from 'src/user/entities/role.entity';
import { User } from 'src/user/entities/user.entity';
import { View } from 'src/user/entities/view.entity';
import { In, Repository } from 'typeorm';
import { rolData, vistaData } from './data/auth.data';
import { leadSourceData, linersData } from './data/config.data';
import {
  departamentosData,
  distritosData,
  provinciasData,
} from './data/ubigeo.data';
import { UsersData } from './data/user.data';
import { PaymentConfig } from 'src/admin-payments/payments-config/entities/payments-config.entity';
import { paymentConfigsData } from './data/payment-configs.data';
import { CutConfiguration } from 'src/cuts/entities/cut_configurations.entity';
import { cutConfigurationsData } from './data/cuts.data';
import { SYSTEM_USER_CONFIG } from './data/user-system.data';
@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);
  constructor(
    @InjectRepository(View)
    private readonly viewRepository: Repository<View>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ubigeo)
    private readonly ubigeoRepository: Repository<Ubigeo>,
    @InjectRepository(Liner)
    private readonly linerRepository: Repository<Liner>,
    @InjectRepository(LeadSource)
    private readonly leadSourceRepository: Repository<LeadSource>,
    @InjectRepository(PaymentConfig)
    private readonly paymentConfigRepository: Repository<PaymentConfig>,
    @InjectRepository(CutConfiguration)
    private readonly cutConfigurationRepository: Repository<CutConfiguration>,
  ) {}
  private async createView(viewData: any, parentView?: View): Promise<View> {
    const { code, name, url, order, icon } = viewData;
    try {
      const existingView = await this.viewRepository.findOne({
        where: { code },
      });
      if (existingView) {
        this.logger.debug(`Vista existente encontrada: ${code}`);
        return existingView;
      }
      const view = this.viewRepository.create({
        name,
        url,
        order,
        icon,
        code,
        isActive: true,
        parent: parentView,
      });
      const savedView = await this.viewRepository.save(view);
      this.logger.log(`Vista creada exitosamente: ${code}`);
      return savedView;
    } catch (error) {
      this.logger.error(`Error al crear vista ${code}: ${error.message}`);
      throw error;
    }
  }
  async seedViews() {
    this.logger.log('Iniciando seed de vistas...');
    try {
      const parentViews = vistaData.filter((view) => !view.parent);
      this.logger.debug(`Encontradas ${parentViews.length} vistas padre`);
      const createdParentViews = await Promise.all(
        parentViews.map((viewData) => this.createView(viewData)),
      );
      const parentViewMap = createdParentViews.reduce((map, view) => {
        map[view.code] = view;
        return map;
      }, {});
      let childrenCount = 0;
      for (const parentView of parentViews) {
        if (parentView.children?.length) {
          this.logger.debug(
            `Procesando ${parentView.children.length} hijos para ${parentView.code}`,
          );
          await Promise.all(
            parentView.children.map(async (childData) => {
              await this.createView(childData, parentViewMap[childData.parent]);
              childrenCount++;
            }),
          );
        }
      }
      this.logger.log(
        `Seed de vistas completado. Creadas ${createdParentViews.length} vistas padre y ${childrenCount} vistas hijas`,
      );
    } catch (error) {
      this.logger.error(`Error en seedViews: ${error.message}`);
      throw error;
    }
  }
  async seedRoles() {
    this.logger.log('Iniciando seed de roles...');
    try {
      const results = await Promise.all(
        rolData.map(async (roleData) => {
          try {
            const existingRole = await this.roleRepository.findOne({
              where: { code: roleData.code },
              relations: ['views'], // ✅ Cargar vistas existentes
            });

            const views = await this.viewRepository.findBy({
              code: In(roleData.views),
            });

            this.logger.debug(
              `Encontradas ${views.length}/${roleData.views.length} vistas para rol ${roleData.code}`,
            );

            if (existingRole) {
              // ✅ Actualizar rol existente
              existingRole.name = roleData.name;
              existingRole.views = views;
              await this.roleRepository.save(existingRole);
              this.logger.log(`Rol actualizado exitosamente: ${roleData.code}`);
              return { status: 'updated', code: roleData.code };
            } else {
              // ✅ Crear nuevo rol
              const role = this.roleRepository.create({
                name: roleData.name,
                code: roleData.code,
                views: views,
              });
              await this.roleRepository.save(role);
              this.logger.log(`Rol creado exitosamente: ${roleData.code}`);
              return { status: 'created', code: roleData.code };
            }
          } catch (error) {
            this.logger.error(
              `Error al procesar rol ${roleData.code}: ${error.message}`,
            );
            return {
              status: 'error',
              code: roleData.code,
              error: error.message,
            };
          }
        }),
      );

      const created = results.filter((r) => r.status === 'created').length;
      const updated = results.filter((r) => r.status === 'updated').length;
      const errors = results.filter((r) => r.status === 'error').length;

      this.logger.log(
        `Seed de roles completado. Creados: ${created}, Actualizados: ${updated}, Errores: ${errors}`,
      );
    } catch (error) {
      this.logger.error(`Error en seedRoles: ${error.message}`);
      throw error;
    }
  }
  async seedUsers() {
    this.logger.log('Iniciando seed de usuarios...');
    try {
      const roles = await this.roleRepository.find();
      const roleIdMap = roles.reduce((map, role) => {
        map[role.code] = role.id;
        return map;
      }, {});
      const userData: { [key: string]: any[] } = UsersData(roleIdMap);
      let created = 0;
      let existing = 0;
      let errors = 0;
      for (const [rolKey, usuarios] of Object.entries(userData)) {
        this.logger.debug(
          `Procesando usuarios para rol: ${rolKey.toUpperCase()}`,
        );
        for (const userData of usuarios) {
          try {
            const existingUser = await this.userRepository.findOne({
              where: { email: userData.email },
            });
            if (existingUser) {
              this.logger.debug(`Usuario existente: ${userData.email}`);
              existing++;
              continue;
            }
            const role = roles.find((r) => r.id === userData.roleId);
            if (!role) {
              this.logger.error(
                `Rol no encontrado para ID: ${userData.roleId}`,
              );
              errors++;
              continue;
            }
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            const user = this.userRepository.create({
              ...userData,
              password: hashedPassword,
              role: role,
            });
            await this.userRepository.save(user);
            this.logger.debug(`Usuario creado: ${userData.email}`);
            created++;
          } catch (error) {
            this.logger.error(
              `Error creando usuario ${userData.email}: ${error.message}`,
            );
            errors++;
          }
        }
      }
      this.logger.log(
        `Seed de usuarios completado. Creados: ${created}, Existentes: ${existing}, Errores: ${errors}`,
      );
    } catch (error) {
      this.logger.error(`Error en seedUsers: ${error.message}`);
      throw error;
    }
  }
  async seedSystemUser() {
    this.logger.log('Iniciando seed de usuario SYSTEM...');
    try {
      // Buscar el rol SYSTEM
      const systemRole = await this.roleRepository.findOne({ 
        where: { code: SYSTEM_USER_CONFIG.roleCode } 
      });
      
      if (!systemRole) {
        this.logger.error(`Rol SYSTEM no encontrado con código: ${SYSTEM_USER_CONFIG.roleCode}`);
        throw new Error('Rol SYSTEM no encontrado');
      }

      // Verificar si el usuario ya existe
      const existingUser = await this.userRepository.findOne({
        where: { email: SYSTEM_USER_CONFIG.email },
      });

      const hashedPassword = await bcrypt.hash(SYSTEM_USER_CONFIG.password, 10);
      
      if (existingUser) {
        // Actualizar el usuario existente
        existingUser.password = hashedPassword;
        existingUser.document = SYSTEM_USER_CONFIG.document;
        existingUser.firstName = SYSTEM_USER_CONFIG.firstName;
        existingUser.lastName = SYSTEM_USER_CONFIG.lastName;
        existingUser.role = systemRole;
        
        await this.userRepository.save(existingUser);
        this.logger.log(`Usuario SYSTEM actualizado: ${SYSTEM_USER_CONFIG.email}`);
        return;
      }

      // Crear nuevo usuario si no existe
      const user = this.userRepository.create({
        email: SYSTEM_USER_CONFIG.email,
        password: hashedPassword,
        document: SYSTEM_USER_CONFIG.document,
        firstName: SYSTEM_USER_CONFIG.firstName,
        lastName: SYSTEM_USER_CONFIG.lastName,
        role: systemRole,
      });

      await this.userRepository.save(user);
      this.logger.log(`Usuario SYSTEM creado exitosamente: ${SYSTEM_USER_CONFIG.email}`);
      
    } catch (error) {
      this.logger.error(`Error en seedSystemUser: ${error.message}`);
      throw error;
    }
  }
  async seedUbigeo() {
    this.logger.log('Iniciando seed de ubigeo...');
    try {
      // PASO 1: Insertar todos los departamentos y esperar a que terminen
      this.logger.log('Iniciando inserción de departamentos...');
      const departamentos = departamentosData;

      // Utilizamos Promise.all para esperar que todos los departamentos se inserten
      await Promise.all(
        departamentos.map(async (departamento) => {
          const existingDepartamento = await this.ubigeoRepository.findOne({
            where: { code: departamento.id },
          });

          if (existingDepartamento) {
            this.logger.debug(
              `Departamento existente encontrado: ${departamento.id}`,
            );
            return;
          }

          const newDepartamento = this.ubigeoRepository.create({
            name: departamento.name,
            code: departamento.id,
            parentId: null,
          });

          await this.ubigeoRepository.save(newDepartamento);
          this.logger.log(
            `Departamento creado exitosamente: ${departamento.id}`,
          );
        }),
      );
      this.logger.log('Todos los departamentos han sido procesados.');

      // PASO 2: Insertar todas las provincias y esperar a que terminen
      this.logger.log('Iniciando inserción de provincias...');
      const provincias = provinciasData;

      // Utilizamos Promise.all para esperar que todas las provincias se inserten
      await Promise.all(
        provincias.map(async (provincia) => {
          const existingProvincia = await this.ubigeoRepository.findOne({
            where: { code: provincia.id },
          });

          if (existingProvincia) {
            this.logger.debug(
              `Provincia existente encontrada: ${provincia.id}`,
            );
            return;
          }

          const departamento = await this.ubigeoRepository.findOne({
            where: { code: provincia.department_id },
          });

          if (!departamento) {
            this.logger.error(
              `Departamento no encontrado para provincia ${provincia.id}`,
            );
            return;
          }

          const newProvincia = this.ubigeoRepository.create({
            name: provincia.name,
            code: provincia.id,
            parentId: departamento.id,
          });

          await this.ubigeoRepository.save(newProvincia);
          this.logger.log(`Provincia creada exitosamente: ${provincia.id}`);
        }),
      );
      this.logger.log('Todas las provincias han sido procesadas.');

      // PASO 3: Insertar todos los distritos después de que departamentos y provincias estén listos
      this.logger.log('Iniciando inserción de distritos...');
      const distritos = distritosData;

      // Utilizamos Promise.all para esperar que todos los distritos se inserten
      await Promise.all(
        distritos.map(async (distrito) => {
          const existingDistrito = await this.ubigeoRepository.findOne({
            where: { code: distrito.id },
          });

          if (existingDistrito) {
            this.logger.debug(`Distrito existente encontrado: ${distrito.id}`);
            return;
          }

          // Ahora usamos province_id para obtener la provincia correcta
          const provincia = await this.ubigeoRepository.findOne({
            where: { code: distrito.province_id },
          });

          if (!provincia) {
            this.logger.error(
              `Provincia no encontrada para distrito ${distrito.id}`,
            );
            return;
          }

          const newDistrito = this.ubigeoRepository.create({
            name: distrito.name,
            code: distrito.id,
            parentId: provincia.id,
          });

          await this.ubigeoRepository.save(newDistrito);
          this.logger.log(`Distrito creado exitosamente: ${distrito.id}`);
        }),
      );
      this.logger.log('Todos los distritos han sido procesados.');

      this.logger.log('Seed de ubigeo completado exitosamente.');
    } catch (error) {
      this.logger.error(`Error en seedUbigeo: ${error.message}`);
      throw error;
    }
  }

  async seedLiners() {
    const liners = linersData;
    this.logger.log('Iniciando seed de liners...');
    try {
      liners.forEach(async (liner) => {
        const existingLiner = await this.linerRepository.findOne({
          where: { document: liner.document },
        });
        if (existingLiner) {
          this.logger.debug(`Liner existente encontrado: ${liner.document}`);
          return;
        }
        const newLiner = this.linerRepository.create({
          firstName: liner.firstName,
          lastName: liner.lastName,
          document: liner.document,
          documentType: liner.documentType as DocumentType,
        });
        await this.linerRepository.save(newLiner);
        this.logger.log(`Liner creado exitosamente: ${liner.document}`);
      });
      this.logger.log('Seed de liners completado exitosamente');
    } catch (error) {
      this.logger.error(`Error en seedLiners: ${error.message}`);
      throw error;
    }
  }

  async seedLeadSources() {
    const leadSources = leadSourceData;
    this.logger.log('Iniciando seed de fuentes de leads...');

    try {
      leadSources.forEach(async (leadSource) => {
        const existingLeadSource = await this.leadSourceRepository.findOne({
          where: { name: leadSource },
        });
        if (existingLeadSource) {
          this.logger.debug(
            `Fuente de lead existente encontrada: ${leadSource}`,
          );
          return;
        }
        const newLeadSource = this.leadSourceRepository.create({
          name: leadSource,
        });
        await this.leadSourceRepository.save(newLeadSource);
        this.logger.log(`Fuente de lead creada exitosamente: ${leadSource}`);
      });
      this.logger.log('Seed de fuentes de leads completado exitosamente');
    } catch (error) {
      this.logger.error(`Error en seedLeadSources: ${error.message}`);
      throw error;
    }
  }
  async seedAll() {
    this.logger.log('Iniciando proceso de seed completo...');
    try {
      const startTime = Date.now();
      await this.seedViews();
      await this.seedRoles();
      // await this.seedUsers();
      await this.seedSystemUser();
      await this.seedUbigeo();
      // await this.seedLiners();
      await this.seedLeadSources();
      const duration = Date.now() - startTime;
      this.logger.log(`Seed completo exitosamente en ${duration}ms`);
      return {
        success: true,
        duration: `${duration}ms`,
        message: 'Seed completado exitosamente',
      };
    } catch (error) {
      this.logger.error(`Error durante el seed: ${error.message}`);
      throw error;
    }
  }

  async seedPaymentConfigs() {
    this.logger.log('Iniciando seed de configuraciones de pago...');
    try {
      const results = await Promise.all(
        paymentConfigsData.map(async (configData) => {
          try {
            const existingConfig = await this.paymentConfigRepository.findOne({
              where: { code: configData.code },
            });

            if (existingConfig) {
              this.logger.debug(
                `Configuración de pago existente encontrada: ${configData.code}`,
              );

              Object.assign(existingConfig, configData);
              await this.paymentConfigRepository.save(existingConfig);

              return { status: 'updated', code: configData.code };
            }

            const config = this.paymentConfigRepository.create({
              code: configData.code,
              name: configData.name,
              description: configData.description,
              requiresApproval: configData.requiresApproval,
              isActive: configData.isActive,
              minimumAmount: configData.minimumAmount,
              maximumAmount: configData.maximumAmount,
            });

            await this.paymentConfigRepository.save(config);
            this.logger.log(
              `Configuración de pago creada exitosamente: ${configData.code}`,
            );
            return { status: 'created', code: configData.code };
          } catch (error) {
            this.logger.error(
              `Error al crear configuración de pago ${configData.code}: ${error.message}`,
            );
            return {
              status: 'error',
              code: configData.code,
              error: error.message,
            };
          }
        }),
      );

      const created = results.filter((r) => r.status === 'created').length;
      const updated = results.filter((r) => r.status === 'updated').length;
      const errors = results.filter((r) => r.status === 'error').length;
      this.logger.log(
        `Seed de configuraciones de pago completado. Creados: ${created}, Actualizados: ${updated}, Errores: ${errors}`,
      );

      return {
        created,
        updated,
        errors,
        details: results,
      };
    } catch (error) {
      this.logger.error(
        `Error general en seedPaymentConfigs: ${error.message}`,
      );
      throw error;
    }
  }

  async seedCutConfigurations() {
    this.logger.log('Iniciando seed de configuraciones de corte...');
    try {
      const results = await Promise.all(
        cutConfigurationsData.map(async (configData) => {
          try {
            const existingConfig =
              await this.cutConfigurationRepository.findOne({
                where: { code: configData.code },
              });

            if (existingConfig) {
              this.logger.debug(
                `Configuración de corte existente encontrada: ${configData.code}`,
              );

              Object.assign(existingConfig, configData);
              await this.cutConfigurationRepository.save(existingConfig);

              return { status: 'updated', code: configData.code };
            }

            const config = this.cutConfigurationRepository.create(configData);
            await this.cutConfigurationRepository.save(config);
            this.logger.log(
              `Configuración de corte creada exitosamente: ${configData.code}`,
            );
            return { status: 'created', code: configData.code };
          } catch (error) {
            this.logger.error(
              `Error al crear configuración de corte ${configData.code}: ${error.message}`,
            );
            return {
              status: 'error',
              code: configData.code,
              error: error.message,
            };
          }
        }),
      );

      const created = results.filter((r) => r.status === 'created').length;
      const updated = results.filter((r) => r.status === 'updated').length;
      const errors = results.filter((r) => r.status === 'error').length;
      this.logger.log(
        `Seed de configuraciones de corte completado. Creados: ${created}, Actualizados: ${updated}, Errores: ${errors}`,
      );

      return {
        created,
        updated,
        errors,
        details: results,
      };
    } catch (error) {
      this.logger.error(
        `Error general en seedCutConfigurations: ${error.message}`,
      );
      throw error;
    }
  }
}
