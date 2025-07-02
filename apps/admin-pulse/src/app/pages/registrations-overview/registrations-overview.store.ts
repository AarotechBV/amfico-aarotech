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
  removeAllEntities,
  setEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { UserDto } from '../../models/user.dto';
import { RegistrationDto } from '../../models/registration.dto';
import { RelationDto } from '../../models/relation.dto';
import { PriceListItemsHierarchyDto } from '../../models/price-list-Items-hierarchy.dto';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { distinctUntilChanged, pipe, switchMap, tap } from 'rxjs';
import { computed, inject } from '@angular/core';
import { RegistrationsService } from '../../services/registrations.service';
import { tapResponse } from '@ngrx/operators';
import { UsersService } from '../../services/users.service';
import { RelationsService } from '../../services/relations.service';
import { GroupedRelation, Relation } from '../../models/relation.model';
import { Hierarchy } from '../../models/hierarchy.model';
import { RegistrationsRequestDto } from '../../models/registrations-request.dto';
import { CompanyDto } from '../../models/company.dto';
import { CompaniesService } from '../../services/companies.service';
import { compareRelations } from '../../utils/compare-relations.util';

type RegistrationsOverviewState = {
  _hierarchy: PriceListItemsHierarchyDto | null;
  _loading: number;
};

const initialState: RegistrationsOverviewState = {
  _hierarchy: null,
  _loading: 0,
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

const companyConfig = entityConfig({
  entity: type<CompanyDto>(),
  collection: 'company',
  selectId: (company) => company.id,
});

export const RegistrationsOverviewStore = signalStore(
  withState(initialState),
  withEntities(userConfig),
  withEntities(registrationConfig),
  withEntities(relationConfig),
  withEntities(companyConfig),
  withComputed(
    ({
      _loading,
      _hierarchy,
      registrationEntities,
      userEntityMap,
      relationEntities,
      companyEntityMap,
    }) => {
      const isLoading = computed(() => _loading() > 0);
      const hierarchy = computed((): Hierarchy => {
        const hierarchy = _hierarchy();
        if (hierarchy) {
          return hierarchy.reduce((acc, item) => {
            const [category, subCategory] = item.name.split(' - ');

            const children = item.items.map((item) => ({
              child: item.name,
              id: item.id,
            }));

            const existingCategory = acc.find((c) => c.category === category);
            if (existingCategory) {
              existingCategory.subCategories.push({
                subCategory,
                id: item.id,
                children,
              });
            } else {
              acc.push({
                category,
                subCategories: [
                  {
                    id: item.id,
                    subCategory,
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
      });

      const groupedRelations = computed((): GroupedRelation[] => {
        const relations = relationEntities().reduce((acc, relation) => {
          const startCode =
            relation.code?.split('-')[0] || relation.uniqueIdentifier;
          if (acc[startCode]) {
            acc[startCode].displayNames.push(relation.displayName);
            acc[startCode].codes.push(relation.code);
            acc[startCode].uniqueIdentifiers.push(relation.uniqueIdentifier);
          } else {
            acc[startCode] = {
              ...relation,
              company: companyEntityMap()[relation.companyId],
              displayNames: [relation.displayName],
              startCode,
              uniqueIdentifiers: [relation.uniqueIdentifier],
              codes: [relation.code],
            };
          }
          if (relation.code === startCode) {
            acc[startCode].mainName = relation.displayName;
          }
          return acc;
        }, {} as Record<string, GroupedRelation>);
        return Object.values(relations)
          .sort(compareRelations)
          .map((relation) => {
            const updatedRelation = relation;

            updatedRelation.displayNames = [
              ...new Set(relation.displayNames.filter((name) => !!name)),
            ].sort((a, b) => a.localeCompare(b));

            updatedRelation.codes = [
              ...new Set(relation.codes.filter((code) => !!code)),
            ].sort((a, b) => a.localeCompare(b));

            return updatedRelation;
          });
      });

      const relationsWithRegistrations = computed((): Relation[] => {
        const relations = groupedRelations();
        const registrations = registrationEntities();

        return relations
          .map((relation) => ({
            ...relation,
            registrations: registrations
              .filter((registration) =>
                relation.uniqueIdentifiers.includes(
                  registration.relationIdentifier
                )
              )
              .map((registration) => ({
                ...registration,
                user: userEntityMap()[registration.userId],
              })),
          }))
          .filter((relation) => relation.registrations.length > 0);
      });

      return {
        isLoading,
        hierarchy,
        relationsWithRegistrations,
      };
    }
  ),
  withMethods(
    (
      store,
      registrationsService = inject(RegistrationsService),
      usersService = inject(UsersService),
      relationsService = inject(RelationsService),
      companiesService = inject(CompaniesService)
    ) => {
      const loadHierarchy = rxMethod<void>(
        pipe(
          distinctUntilChanged(),
          tap(() => {
            patchState(store, { _loading: store._loading() + 1 });
          }),
          switchMap(() => {
            return registrationsService.listPriceListItemsHierarchy().pipe(
              tapResponse({
                next: (hierarchy) =>
                  patchState(store, { _hierarchy: hierarchy }),
                error: (err) => console.error(err),
                finalize: () => {
                  patchState(store, { _loading: store._loading() - 1 });
                },
              })
            );
          })
        )
      );

      const loadUsers = rxMethod<{ page: number; pageSize: number }>(
        pipe(
          distinctUntilChanged(),
          tap((request) => {
            patchState(store, { _loading: store._loading() + 1 });
            if (request.page === 0) {
              patchState(store, removeAllEntities(userConfig));
            }
          }),
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
                  } else {
                    console.log(store.userEntities());
                  }
                },
                error: (err) => console.error(err),
                finalize: () => {
                  patchState(store, { _loading: store._loading() - 1 });
                },
              })
            );
          })
        )
      );

      const loadCompanies = rxMethod<void>(
        pipe(
          distinctUntilChanged(),
          tap(() => {
            patchState(store, { _loading: store._loading() + 1 });
          }),
          switchMap(() => {
            return companiesService.listAllCompanies().pipe(
              tapResponse({
                next: (companies) => {
                  patchState(store, setEntities(companies, companyConfig));
                },
                error: (err) => console.error(err),
                finalize: () => {
                  patchState(store, { _loading: store._loading() - 1 });
                },
              })
            );
          })
        )
      );

      const loadRelations = rxMethod<{ page: number; pageSize: number }>(
        pipe(
          distinctUntilChanged(),
          tap((request) => {
            patchState(store, { _loading: store._loading() + 1 });
            if (request.page === 0) {
              patchState(store, removeAllEntities(relationConfig));
            }
          }),
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
                    } else {
                      console.log(
                        store.relationEntities().filter(
                          (rel) =>
                            // rel.code === '1001-01' || rel.code === '1001'
                            rel.code === '3093' ||
                            rel.code === '1346' ||
                            rel.uniqueIdentifier === 'APR00008'
                        )
                      );
                    }
                  },
                  error: (err) => console.error(err),
                  finalize: () => {
                    patchState(store, { _loading: store._loading() - 1 });
                  },
                })
              );
          })
        )
      );

      const loadRegistrations = rxMethod<{
        request: RegistrationsRequestDto;
        page: number;
        pageSize: number;
      }>(
        pipe(
          distinctUntilChanged(),
          tap((request) => {
            patchState(store, { _loading: store._loading() + 1 });
            if (request.page === 0) {
              patchState(store, removeAllEntities(registrationConfig));
            }
          }),
          switchMap((request) => {
            return registrationsService
              .listRegistrations(
                request.request,
                request.page,
                request.pageSize
              )
              .pipe(
                tapResponse({
                  next: (page) => {
                    patchState(
                      store,
                      setEntities(page.results, registrationConfig)
                    );
                    if (page.currentPage < page.pageCount) {
                      loadRegistrations({
                        request: request.request,
                        page: page.currentPage + 1,
                        pageSize: request.pageSize,
                      });
                    }
                  },
                  error: (err) => console.error(err),
                  finalize: () => {
                    patchState(store, { _loading: store._loading() - 1 });
                  },
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
        loadCompanies,
      };
    }
  ),
  withHooks({
    onInit(store) {
      store.loadHierarchy();
      store.loadCompanies();
      store.loadUsers({ page: 0, pageSize: 50 });
      store.loadRelations({ page: 0, pageSize: 50 });
    },
  })
);
