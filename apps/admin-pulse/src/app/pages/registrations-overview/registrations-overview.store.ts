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
import {
  Relation,
  RelationWithInvoicesSchedules,
} from '../../models/relation.model';
import { Hierarchy } from '../../models/hierarchy.model';
import { RegistrationsRequestDto } from '../../models/registrations-request.dto';
import { CompanyDto } from '../../models/company.dto';
import { CompaniesService } from '../../services/companies.service';
import { InvoicesScheduleDto } from '../../models/invoices-schedule.dto';
import { compareRelations } from '../../utils/compare-relations.util';
import { InvoiceDto } from '../../models/invoice.dto';
import { InvoicesRequestDto } from '../../models/invoices-request.dto';
import { InvoicesService } from '../../services/invoices.service';
import { parseDateFromString } from '../../utils/parse-date-from-string.util';

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

const invoiceConfig = entityConfig({
  entity: type<InvoiceDto>(),
  collection: 'invoice',
  selectId: (invoice) => invoice.id,
});

const relationConfig = entityConfig({
  entity: type<RelationDto>(),
  collection: 'relation',
  selectId: (relation) => relation.uniqueIdentifier,
});

const invoicesScheduleConfig = entityConfig({
  entity: type<InvoicesScheduleDto>(),
  collection: 'invoicesSchedule',
  selectId: (invoicesSchedule) => invoicesSchedule.id,
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
  withEntities(invoicesScheduleConfig),
  withEntities(invoiceConfig),
  withComputed(
    ({
      _loading,
      _hierarchy,
      registrationEntities,
      userEntityMap,
      relationEntities,
      relationEntityMap,
      companyEntityMap,
      invoicesScheduleEntityMap,
      invoicesScheduleEntities,
      invoiceEntities,
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

      const identifiersInvoicedOnOtherRelations = computed((): string[] => {
        const invoicesSchedulesEntities = invoicesScheduleEntities();

        return invoicesSchedulesEntities
          .map((schedule) =>
            schedule.invoicedOnBehalfOf.filter(
              (identifier) => identifier !== schedule.relationIdentifier
            )
          )
          .flat();
      });

      const relationsWithInvoicesSchedules = computed(
        (): RelationWithInvoicesSchedules[] => {
          const relationDtos = relationEntities();
          const relationMap = relationEntityMap();
          const companyMap = companyEntityMap();
          const invoicesSchedulesEntityMap = invoicesScheduleEntityMap();
          const identiefiersToRemove = identifiersInvoicedOnOtherRelations();
          return relationDtos
            .filter(
              (relationDto) =>
                !identiefiersToRemove.includes(relationDto.uniqueIdentifier)
            )
            .sort(compareRelations)
            .map((relationDto) => {
              const invoicedOnBehalfOfIdentifiers = [...new Set(invoicesScheduleEntities().filter(schedule => schedule.relationIdentifier === relationDto.uniqueIdentifier).map(schedule => schedule.invoicedOnBehalfOf).flat())];
                // invoicesSchedulesEntityMap[relationDto.uniqueIdentifier]
                //   ?.invoicedOnBehalfOf || [];



              const invoicedOnBehalfOfCodes = invoicedOnBehalfOfIdentifiers
                .map((identifier) => relationMap[identifier]?.code)
                .filter((code) => code !== undefined);

              const company = companyMap[relationDto.companyId];

              return {
                ...relationDto,
                invoicedOnBehalfOfIdentifiers,
                invoicedOnBehalfOfCodes,
                company,
              };
            });
        }
      );

      const relationsWithRegistrations = computed((): Relation[] => {
        const relations = relationsWithInvoicesSchedules();
        const registrations = registrationEntities();
        const invoices = invoiceEntities();

        return relations
          .map((relation) => ({
            ...relation,
            registrations: registrations
              .filter((registration) =>
                [
                  relation.uniqueIdentifier,
                  ...relation.invoicedOnBehalfOfIdentifiers,
                ].includes(registration.relationIdentifier)
              )
              .map((registration) => ({
                ...registration,
                user: userEntityMap()[registration.userId],
              })),
            invoices: invoices
              .filter(
                (invoice) =>
                  invoice.relationIdentifier === relation.uniqueIdentifier
              )
              .map((invoice) => ({
                ...invoice,
                dueDateAsDate: parseDateFromString(invoice.dueDate),
              })),
          }))
          .filter((relation) => relation.registrations.length > 0);
      });

      return {
        isLoading,
        hierarchy,
        relationsWithRegistrations,
        relationsWithInvoicesSchedules,
        identifiersInvoicedOnOtherRelations,
      };
    }
  ),
  withMethods(
    (
      store,
      registrationsService = inject(RegistrationsService),
      invoicesService = inject(InvoicesService),
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

      const loadUsers = rxMethod<{ page: number; pageSize?: number }>(
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

      const loadRelations = rxMethod<{ page: number; pageSize?: number }>(
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

      const loadInvoicesSchedules = rxMethod<{
        page: number;
        pageSize?: number;
      }>(
        pipe(
          distinctUntilChanged(),
          tap((request) => {
            patchState(store, { _loading: store._loading() + 1 });
            if (request.page === 0) {
              patchState(store, removeAllEntities(invoicesScheduleConfig));
            }
          }),
          switchMap((request) => {
            return relationsService
              .listAllInvoicesSchedules(request.page, request.pageSize)
              .pipe(
                tapResponse({
                  next: (page) => {
                    patchState(
                      store,
                      setEntities(page.results, invoicesScheduleConfig)
                    );

                    if (page.currentPage < page.pageCount) {
                      loadInvoicesSchedules({
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

      const loadRegistrations = rxMethod<{
        request: RegistrationsRequestDto;
        page: number;
        pageSize?: number;
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
                      setEntities(
                        page.results.filter(
                          (registration) =>
                            registration.neverInvoice ===
                              request.request.neverInvoice &&
                            !registration.inFixedAmount
                        ),
                        registrationConfig
                      )
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

      const loadInvoices = rxMethod<{
        request: InvoicesRequestDto;
        page: number;
        pageSize?: number;
      }>(
        pipe(
          distinctUntilChanged(),
          tap((request) => {
            patchState(store, { _loading: store._loading() + 1 });
            if (request.page === 0) {
              patchState(store, removeAllEntities(invoiceConfig));
            }
          }),
          switchMap((request) => {
            return invoicesService
              .listAllInvoices(request.request, request.page, request.pageSize)
              .pipe(
                tapResponse({
                  next: (page) => {
                    patchState(store, setEntities(page.results, invoiceConfig));

                    if (page.currentPage < page.pageCount) {
                      loadInvoices({
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
        loadInvoicesSchedules,
        loadInvoices,
      };
    }
  ),
  withHooks({
    onInit(store) {
      store.loadHierarchy();
      store.loadCompanies();
      store.loadUsers({ page: 0 });
      store.loadRelations({ page: 0 });
      store.loadInvoicesSchedules({ page: 0 });
    },
  })
);
