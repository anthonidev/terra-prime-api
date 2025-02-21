import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from 'src/user/entities/role.entity';
import { View } from 'src/user/entities/view.entity';
import { User } from 'src/user/entities/user.entity';
import { In, Repository } from 'typeorm';
import { rolData, vistaData } from './data/auth.data';
import * as bcrypt from 'bcryptjs';
import { UsersData } from './data/user.data';

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

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
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
            });

            if (existingRole) {
              this.logger.debug(`Rol existente encontrado: ${roleData.code}`);
              return { status: 'existing', code: roleData.code };
            }

            const views = await this.viewRepository.findBy({
              code: In(roleData.views),
            });

            this.logger.debug(
              `Encontradas ${views.length}/${roleData.views.length} vistas para rol ${roleData.code}`,
            );

            const role = this.roleRepository.create({
              name: roleData.name,
              code: roleData.code,
              views: views,
            });

            await this.roleRepository.save(role);
            this.logger.log(`Rol creado exitosamente: ${roleData.code}`);
            return { status: 'created', code: roleData.code };
          } catch (error) {
            this.logger.error(
              `Error al crear rol ${roleData.code}: ${error.message}`,
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
      const existing = results.filter((r) => r.status === 'existing').length;
      const errors = results.filter((r) => r.status === 'error').length;

      this.logger.log(
        `Seed de roles completado. Creados: ${created}, Existentes: ${existing}, Errores: ${errors}`,
      );
    } catch (error) {
      this.logger.error(`Error en seedRoles: ${error.message}`);
      throw error;
    }
  }

  async seedUsers() {
    this.logger.log('Iniciando seed de usuarios...');

    try {
      // Primero obtener todos los roles y crear un mapeo de código a ID
      const roles = await this.roleRepository.find();
      const roleIdMap = roles.reduce((map, role) => {
        map[role.code] = role.id;
        return map;
      }, {});

      // Generar los datos de usuarios con los IDs correctos
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

  async seedAll() {
    this.logger.log('Iniciando proceso de seed completo...');

    try {
      const startTime = Date.now();

      await this.seedViews();
      await this.seedRoles();
      await this.seedUsers();

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
}
