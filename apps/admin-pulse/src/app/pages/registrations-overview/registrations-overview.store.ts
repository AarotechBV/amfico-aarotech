import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  entityConfig,
  setEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { UserDto } from '../../models/user.dto';
import { RegistrationDto } from '../../models/registration.dto';
import { RelationDto } from '../../models/relation.dto';
import { PriceListItemsHierarchyDto } from '../../models/price-list-Items-hierarchy.dto';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { distinctUntilChanged, pipe, switchMap } from 'rxjs';
import { computed, inject } from '@angular/core';
import { RegistrationsService } from '../../services/registrations.service';
import { tapResponse } from '@ngrx/operators';
import { UsersService } from '../../services/users.service';
import { RelationsService } from '../../services/relations.service';
import { Relation } from '../../models/relation.model';
import { Hierarchy } from '../../models/hierarchy.model';

type RegistrationsOverviewState = {
  _hierarchy: PriceListItemsHierarchyDto | null;
};

const initialState: RegistrationsOverviewState = {
  _hierarchy: null,
};

const userConfig = entityConfig({
  entity: type<UserDto>(),
  collection: 'user',
  selectId: (user) => user.id,
});

const registrationConfig = entityConfig({
  entity: type<RegistrationDto>(),
  collection: 'registration',
  selectId: (registration) => registration.id,
});

const relationConfig = entityConfig({
  entity: type<RelationDto>(),
  collection: 'relation',
  selectId: (relation) => relation.id,
});

export const RegistrationsOverviewStore = signalStore(
  withState(initialState),
  withEntities(userConfig),
  withEntities(registrationConfig),
  withEntities(relationConfig),
  withComputed(
    ({
      _hierarchy,
      registrationEntities,
      userEntityMap,
      relationEntities,
    }) => ({
      hierarchy: computed((): Hierarchy => {
        const hierarchy = _hierarchy();
        if (hierarchy) {
          return hierarchy.reduce((acc, item) => {
            const [category, subCategory] = item.name.split(' - ');

            const children = item.items.map((item) => ({
              child: item.name,
              code: item.code,
            }));

            const existingCategory = acc.find((c) => c.category === category);
            if (existingCategory) {
              existingCategory.subCategories.push({
                subCategory,
                children,
              });
            } else {
              acc.push({
                category,
                subCategories: [
                  {
                    subCategory: subCategory,
                    children,
                  },
                ],
              });
            }
            return acc;
          }, [] as Hierarchy);
        } else {
          return [];
        }
      }),

      relationsWithRegistrations: computed((): Relation[] => {
        const relations = relationEntities().sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        const registrations = registrationEntities();

        return relations
          .map((relation) => ({
            ...relation,
            registrations: registrations
              .filter(
                (registration) =>
                  registration.relationIdentifier === relation.uniqueIdentifier
              )
              .map((registration) => ({
                ...registration,
                user: userEntityMap()[registration.userId],
              })),
          }))
          .filter((relation) => relation.registrations.length > 0);
      }),
    })
  ),
  withMethods(
    (
      store,
      registrationsService = inject(RegistrationsService),
      usersService = inject(UsersService),
      relationsService = inject(RelationsService)
    ) => {
      const loadHierarchy = rxMethod<void>(
        pipe(
          distinctUntilChanged(),
          switchMap(() => {
            return registrationsService.listPriceListItemsHierarchy().pipe(
              tapResponse({
                next: (hierarchy) =>
                  patchState(store, { _hierarchy: hierarchy }),
                error: (err) => console.error(err),
              })
            );
          })
        )
      );

      const loadUsers = rxMethod<{ page: number; pageSize: number }>(
        pipe(
          distinctUntilChanged(),
          switchMap((request) => {
            return usersService.listUsers(request.page, request.pageSize).pipe(
              tapResponse({
                next: (page) => {
                  patchState(store, setEntities(page.results, userConfig));
                  if (page.currentPage < page.pageCount) {
                    loadUsers({
                      page: page.currentPage + 1,
                      pageSize: request.pageSize,
                    });
                  }
                },
                error: (err) => console.error(err),
              })
            );
          })
        )
      );

      const loadRegistrations = rxMethod<{ page: number; pageSize: number }>(
        pipe(
          distinctUntilChanged(),
          switchMap((request) => {
            return relationsService
              .listAllRelations(request.page, request.pageSize)
              .pipe(
                tapResponse({
                  next: (page) => {
                    patchState(
                      store,
                      setEntities(page.results, relationConfig)
                    );
                    if (page.currentPage < page.pageCount) {
                      loadRelations({
                        page: page.currentPage + 1,
                        pageSize: request.pageSize,
                      });
                    }
                  },
                  error: (err) => console.error(err),
                })
              );
          })
        )
      );

      const loadRelations = rxMethod<{ page: number; pageSize: number }>(
        pipe(
          distinctUntilChanged(),
          switchMap((request) => {
            return registrationsService
              .listRegistrations(request.page, request.pageSize)
              .pipe(
                tapResponse({
                  next: (page) => {
                    patchState(
                      store,
                      setEntities(page.results, registrationConfig)
                    );
                    if (page.currentPage < page.pageCount) {
                      loadRegistrations({
                        page: page.currentPage + 1,
                        pageSize: request.pageSize,
                      });
                    }
                  },
                  error: (err) => console.error(err),
                })
              );
          })
        )
      );

      return {
        loadHierarchy,
        loadUsers,
        loadRegistrations,
        loadRelations,
      };
    }
  ),
  withHooks({
    onInit(store) {
      store.loadHierarchy();
      store.loadUsers({ page: 0, pageSize: 50 });
      store.loadRegistrations({ page: 0, pageSize: 50 });
      store.loadRelations({ page: 0, pageSize: 50 });
    },
  })
);
