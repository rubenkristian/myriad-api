import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  response,
} from '@loopback/rest';
import {SavedExperience} from '../models';
import {SavedExperienceRepository} from '../repositories';

export class SavedExperienceController {
  constructor(
    @repository(SavedExperienceRepository)
    public savedExperienceRepository : SavedExperienceRepository,
  ) {}

  @post('/saved-experiences')
  @response(200, {
    description: 'SavedExperience model instance',
    content: {'application/json': {schema: getModelSchemaRef(SavedExperience)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(SavedExperience, {
            title: 'NewSavedExperience',
            
          }),
        },
      },
    })
    savedExperience: SavedExperience,
  ): Promise<SavedExperience> {
    return this.savedExperienceRepository.create(savedExperience);
  }

  @get('/saved-experiences/count')
  @response(200, {
    description: 'SavedExperience model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(SavedExperience) where?: Where<SavedExperience>,
  ): Promise<Count> {
    return this.savedExperienceRepository.count(where);
  }

  @get('/saved-experiences')
  @response(200, {
    description: 'Array of SavedExperience model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(SavedExperience, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(SavedExperience) filter?: Filter<SavedExperience>,
  ): Promise<SavedExperience[]> {
    return this.savedExperienceRepository.find(filter);
  }

  @patch('/saved-experiences')
  @response(200, {
    description: 'SavedExperience PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(SavedExperience, {partial: true}),
        },
      },
    })
    savedExperience: SavedExperience,
    @param.where(SavedExperience) where?: Where<SavedExperience>,
  ): Promise<Count> {
    return this.savedExperienceRepository.updateAll(savedExperience, where);
  }

  @get('/saved-experiences/{id}')
  @response(200, {
    description: 'SavedExperience model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(SavedExperience, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(SavedExperience, {exclude: 'where'}) filter?: FilterExcludingWhere<SavedExperience>
  ): Promise<SavedExperience> {
    return this.savedExperienceRepository.findById(id, filter);
  }

  @patch('/saved-experiences/{id}')
  @response(204, {
    description: 'SavedExperience PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(SavedExperience, {partial: true}),
        },
      },
    })
    savedExperience: SavedExperience,
  ): Promise<void> {
    await this.savedExperienceRepository.updateById(id, savedExperience);
  }

  @put('/saved-experiences/{id}')
  @response(204, {
    description: 'SavedExperience PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() savedExperience: SavedExperience,
  ): Promise<void> {
    await this.savedExperienceRepository.replaceById(id, savedExperience);
  }

  @del('/saved-experiences/{id}')
  @response(204, {
    description: 'SavedExperience DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.savedExperienceRepository.deleteById(id);
  }
}