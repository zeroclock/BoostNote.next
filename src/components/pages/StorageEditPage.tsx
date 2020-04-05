import React, { useMemo, useCallback, useState } from 'react'
import { useDb } from '../../lib/db'
import { entries, values } from '../../lib/db/utils'
import { NoteStorage, ObjectMap, PopulatedFolderDoc } from '../../lib/db/types'
import { useRouter } from '../../lib/router'
import { useDialog, DialogIconTypes } from '../../lib/dialog'
import { useToast } from '../../lib/toast'
import { useTranslation } from 'react-i18next'
import PageContainer from '../atoms/PageContainer'
import {
  FormHeading,
  FormGroup,
  FormLabel,
  FormTextInput,
  FormBlockquote,
  FormPrimaryButton,
  FormSecondaryButton,
} from '../atoms/form'
import LinkCloudStorageForm from '../organisms/LinkCloudStorageForm'
import ManageCloudStorageForm from '../organisms/ManageCloudStorageForm'
import FolderList from '../organisms/FolderList/FolderList'

interface StorageEditProps {
  storage: NoteStorage
}

export default ({ storage }: StorageEditProps) => {
  const db = useDb()
  const router = useRouter()
  const { t } = useTranslation()
  const [name, setName] = useState(storage.name)
  const { messageBox } = useDialog()
  const { pushMessage } = useToast()

  const removeCallback = useCallback(() => {
    messageBox({
      title: `Remove "${storage.name}" storage`,
      message: t('storage.removeMessage'),
      iconType: DialogIconTypes.Warning,
      buttons: [t('storage.remove'), t('general.cancel')],
      defaultButtonIndex: 0,
      cancelButtonIndex: 1,
      onClose: async (value: number | null) => {
        if (value === 0) {
          try {
            await db.removeStorage(storage.id)
            router.push('/app')
          } catch {
            pushMessage({
              title: t('general.networkError'),
              description: `An error occurred while deleting storage (id: ${storage.id})`,
            })
          }
        }
      },
    })
  }, [storage, t, db, router, messageBox, pushMessage])

  const updateStorageName = useCallback(() => {
    db.renameStorage(storage.id, name)
  }, [storage.id, db, name])

  const getFolderTreeData = (folderArray: PopulatedFolderDoc[]) => {
    let result: string[] = []
    folderArray.forEach((folder) => {
      const paths = folder.pathname.split('/')
      paths.splice(0, 1)
      result = setRecursivePathArray(paths, result)
    })
    return transformArrayToMap(result)
  }

  const setRecursivePathArray = (input: string[], tempResult: string[]) => {
    const key = input.shift()
    if (key == null) return []
    if (
      tempResult[key] !== '' &&
      tempResult[key] !== null &&
      tempResult[key] !== undefined
    ) {
      tempResult[key] = setRecursivePathArray(input, tempResult[key])
    } else {
      if (_.isEmpty(input)) {
        tempResult[key] = []
      } else {
        tempResult[key] = setRecursivePathArray(input, [])
      }
    }
    return tempResult
  }

  const transformArrayToMap = (input: string[]) => {
    const result: Record<string, any>[] = []
    Object.keys(input).forEach((key) => {
      if (Object.keys(input[key]).length > 0) {
        result.push({
          title: key,
          isDirectory: true,
          children: transformArrayToMap(input[key]),
          expanded: true,
        })
      } else {
        result.push({ title: key, isDirectory: true })
      }
    })
    return result
  }

  const folderTreeData = getFolderTreeData(values(storage.folderMap))

  return (
    <PageContainer>
      <FormHeading depth={1}>Storage Settings</FormHeading>
      <FormGroup>
        <FormLabel>{t('storage.name')}</FormLabel>
        <FormTextInput
          type='text'
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
        />
      </FormGroup>
      <FormGroup>
        <FormPrimaryButton onClick={updateStorageName}>
          Update storage name
        </FormPrimaryButton>
      </FormGroup>
      <hr />
      <FormHeading depth={2}>Folders</FormHeading>
      <FolderList folderTreeData={folderTreeData}></FolderList>
      <FormGroup>
        <FormPrimaryButton onClick={updateStorageName}>
          Update folders
        </FormPrimaryButton>
      </FormGroup>
      <hr />
      <FormHeading depth={2}>Remove Storage</FormHeading>
      {storage.cloudStorage != null && (
        <FormBlockquote>
          Your cloud storage will not be deleted by clicking this button. To
          delete cloud storage too, check cloud storage info section.
        </FormBlockquote>
      )}
      <FormGroup>
        <FormSecondaryButton onClick={removeCallback}>
          Remove Storage
        </FormSecondaryButton>
      </FormGroup>
      <hr />

      <FormHeading depth={2}>Cloud Storage info</FormHeading>
      {storage.cloudStorage == null ? (
        <LinkCloudStorageForm storage={storage} />
      ) : (
        <ManageCloudStorageForm storage={storage} />
      )}
    </PageContainer>
  )
}
